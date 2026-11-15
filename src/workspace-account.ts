// This identifies the mounted workspace, not authentication. The server must
// compare it with the authenticated session before reading or applying edits.
export const workspaceAccountHeader = 'X-Workspace-Account';
export const workspaceAccountChanged = 'WORKSPACE_ACCOUNT_CHANGED';
