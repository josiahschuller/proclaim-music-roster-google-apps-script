// Stored in Script Properties:
//   WORSHIP_TOOLS_ACCOUNT_ID – the account UUID (path segment in every URL)
//
// The Bearer token is short-lived (~1 hour). Copy it from the weAuthToken cookie
// in your browser (DevTools → Application → Cookies → planning.worshiptools.com)
// and pass it as the `bearerToken` argument when constructing WorshipToolsAPI.

class WorshipToolsAPI {
  /**
   * @param {string} bearerToken – The weAuthToken JWT copied from your browser session.
   */
  constructor(bearerToken) {
    this.baseUrl   = 'https://api.worship.tools/v1';
    this.accountId = PropertiesService.getScriptProperties().getProperty('WORSHIP_TOOLS_ACCOUNT_ID');
    this.token     = bearerToken;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  _headers() {
    return {
      'Authorization': 'Bearer ' + this.token,
      'Accept':        'application/json, text/plain, */*',
    };
  }

  _fetch(url, options) {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: this._headers(),
      ...options,
    });

    const status = response.getResponseCode();
    if (status === 204) return null;

    const body = response.getContentText();
    if (status < 200 || status >= 300) {
      throw new Error(`WorshipTools API error ${status}: ${body}`);
    }

    return body ? JSON.parse(body) : null;
  }

  // -------------------------------------------------------------------------
  // Public API methods
  // -------------------------------------------------------------------------

  /**
   * Get one or more people in the account.
   *
   * GET /v1/account/{accountId}/people?id={personId}
   *
   * @param {string} [personId] – UUID of a specific person; omit to return all.
   * @returns {Array<{id, firstName, lastName, avatar, blockoutDates, emailVerified}>}
   */
  getPeople(personId = null) {
    const url = `${this.baseUrl}/account/${this.accountId}/people`
      + (personId ? `?id=${encodeURIComponent(personId)}` : '');
    return this._fetch(url, { method: 'GET' });
  }

  /**
   * Get all role groups and their roles for the account.
   *
   * GET /v1/account/{accountId}/meta/roles
   *
   * Note: roles/groups with archived:true should be ignored.
   *
   * @returns {Array<{id, name, archived, roles: Array<{id, name, archived}>}>}
   */
  getRoles() {
    const url = `${this.baseUrl}/account/${this.accountId}/meta/roles`;
    return this._fetch(url, { method: 'GET' });
  }

  /**
   * Roster a person to a role at a service.
   *
   * POST /v1/account/{accountId}/service/{serviceId}/people
   * Body: { user: userId, role: roleId }
   *
   * @param {string} serviceId – UUID of the service.
   * @param {string} userId    – UUID of the person to roster.
   * @param {string} roleId    – UUID of the role to assign.
   * @returns {{id: string}} – The rostering record ID (needed to remove the person later).
   */
  rosterPersonToService(serviceId, userId, roleId) {
    const url = `${this.baseUrl}/account/${this.accountId}/service/${serviceId}/people`;
    return this._fetch(url, {
      method:  'POST',
      payload: JSON.stringify({ user: userId, role: roleId }),
    });
  }

  /**
   * Remove a rostered person from a service.
   *
   * DELETE /v1/account/{accountId}/service/{serviceId}/people/{rosteringId}
   *
   * @param {string} serviceId   – UUID of the service.
   * @param {string} rosteringId – The ID returned by rosterPersonToService().
   * @returns {null} – Returns null on success (HTTP 204 No Content).
   */
  removePersonFromService(serviceId, rosteringId) {
    const url = `${this.baseUrl}/account/${this.accountId}/service/${serviceId}/people/${rosteringId}`;
    return this._fetch(url, {
      method:  'DELETE',
      payload: JSON.stringify({}),
    });
  }

  /**
   * Obtain a Firebase ID token by:
   * 1. GET /config/firebase → { apiKey, ... }
   * 2. GET /firebase/token  → { token: customToken }
   * 3. Exchange customToken for an ID token via Firebase Auth REST API.
   *
   * @returns {string} A Firebase ID token suitable for Firestore REST calls.
   */
  _getFirebaseIdToken() {
    const config = this._fetch(`${this.baseUrl}/config/firebase`, { method: 'GET' });
    const apiKey = config.apiKey;
    if (!apiKey) throw new Error('Firebase config missing apiKey');

    const customToken = this._fetch(`${this.baseUrl}/firebase/token`, { method: 'GET' });
    if (!customToken.token) throw new Error('Firebase token response missing token');

    const authResponse = UrlFetchApp.fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify({ token: customToken.token, returnSecureToken: true }),
        muteHttpExceptions: true,
      }
    );

    const authStatus = authResponse.getResponseCode();
    const authBody = JSON.parse(authResponse.getContentText());
    if (authStatus < 200 || authStatus >= 300) {
      throw new Error(`Firebase auth error ${authStatus}: ${JSON.stringify(authBody)}`);
    }

    return authBody.idToken;
  }

  /**
   * Replace all songs on a service's cuelist in Firestore.
   *
   * Uses the WorshipTools API to obtain a Firebase ID token, then writes
   * to Firestore via its REST API — mirroring what the web app does via
   * firebaseService.saveServiceCues().
   *
   * @param {string} serviceId – UUID of the service (= cuelist document ID).
   * @param {Array<{worshipToolsId: string, displayName: string}>} songs
   *   Each song's `worshipToolsId` is the value stored in SONGS_TABLE "WorshipTools ID"
   *   column, which maps to `cue_foreground.text` in the Firestore document.
   *   A fresh `cue_id` UUID is generated per cue.
   */
  syncSongsToService(serviceId, songs) {
    const firebaseToken = this._getFirebaseIdToken();

    const project = 'worship-extreme-datastore';
    const docPath = `accounts/${this.accountId}/cuelists/${serviceId}`;
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${docPath}`
      + '?updateMask.fieldPaths=data.cues&updateMask.fieldPaths=data.songMeta';

    const cueValues = [];
    const songMetaFields = {};

    songs.forEach(({ worshipToolsId, displayName }) => {
      const cueId = Utilities.getUuid();
      cueValues.push({
        mapValue: {
          fields: {
            cue_id:         { stringValue: cueId },
            cue_type:       { stringValue: '' },
            cue_name:       { stringValue: '' },
            cue_transition: { stringValue: '0.25' },
            cue_foreground: {
              mapValue: {
                fields: {
                  type: { stringValue: 'text' },
                  text: { stringValue: worshipToolsId },
                },
              },
            },
            cue_background: {
              mapValue: {
                fields: {
                  type: { stringValue: '' },
                  data: {
                    mapValue: {
                      fields: {
                        inherit: { booleanValue: false },
                      },
                    },
                  },
                },
              },
            },
            displayName: { stringValue: displayName },
            cue_options: { mapValue: { fields: {} } },
            length:      { integerValue: '0' },
            apps:        { arrayValue: { values: [] } },
          },
        },
      });
      songMetaFields[cueId] = {
        mapValue: {
          fields: {
            notes: { stringValue: '' },
            key:   { stringValue: '' },
          },
        },
      };
    });

    const body = {
      fields: {
        data: {
          mapValue: {
            fields: {
              cues:     { arrayValue: { values: cueValues } },
              songMeta: { mapValue: { fields: songMetaFields } },
            },
          },
        },
      },
    };

    const response = UrlFetchApp.fetch(url, {
      method:           'PATCH',
      contentType:      'application/json',
      headers:          { 'Authorization': 'Bearer ' + firebaseToken },
      payload:          JSON.stringify(body),
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      throw new Error(`Firestore error ${status}: ${response.getContentText()}`);
    }
  }
}
