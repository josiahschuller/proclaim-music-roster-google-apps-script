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
}
