export const messages = {
  title: "Reverse Proxy Manager",
  rootNotFound: "Application root element was not found",
  unexpectedResponse: "The server returned an unexpected response",
  requestFailed: "Request failed with status {status}",
  editSite: "Edit site",
  addSiteDialog: "Add a site",
  siteName: "Site name",
  publicHost: "Public domain or IP address",
  publicHostHelp: "Domains use HTTPS and Let's Encrypt; IP addresses use HTTP.",
  containerService: "Container service name",
  containerServiceHelp: "The application container must join the proxy network.",
  internalPort: "Internal application port",
  routeEnabled: "Route enabled",
  cancel: "Cancel",
  close: "Close",
  saving: "Saving…",
  saveChanges: "Save changes",
  createSite: "Create site",
  enabled: "Enabled",
  disabled: "Disabled",
  backend: "Backend",
  latestDeployment: "Latest deployment",
  deploymentStatuses: {
    queued: "queued",
    running: "running",
    succeeded: "succeeded",
    failed: "failed",
  },
  enableRouteFor: "Enable route for {name}",
  route: "Route",
  deploy: "Deploy",
  editNamed: "Edit {name}",
  deleteNamed: "Delete {name}",
  deployFromGitHub: "Deploy {name} from GitHub",
  deploymentWarning: "Only deploy repositories you trust. Compose files can create containers with host-level access.",
  deploymentNetworkHelp: "The Compose backend service must be named {service} and join the external {network} network.",
  repositoryUrl: "Public GitHub repository URL",
  repositoryPlaceholder: "https://github.com/owner/repository",
  branch: "Branch",
  composeFile: "Compose file",
  composeFileHelp: "A relative .yml or .yaml path inside the repository.",
  queueing: "Queueing…",
  queueDeployment: "Queue deployment",
  controlPanel: "VPS CONTROL PANEL",
  signIn: "Sign in",
  signInHelp: "Sign in with your administrator account to manage sites.",
  username: "Username",
  password: "Password",
  signingIn: "Signing in…",
  sessionExpired: "Your session expired. Sign in again.",
  checkingSession: "Checking administrator session",
  appName: "Proxy Manager",
  signedInAs: "Signed in as {username}",
  signOut: "Sign out",
  sites: "Sites",
  sitesHelp: "Manage public routes to your application containers.",
  addSite: "Add site",
  loadingSites: "Loading sites",
  noSites: "No sites configured",
  noSitesHelp: "Add a domain or IP address to route traffic to an application container.",
  createFirstSite: "Create your first site",
  deleteSiteTitle: "Delete site?",
  deleteSiteHelp: "This will remove the route for {host}. This action cannot be undone.",
  deleteSite: "Delete site",
};

export function formatMessage(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name] ?? "") : match,
  );
}

export function messageParts(template, values) {
  return template.split(/(\{\w+\})/g).map((part) => {
    const match = /^\{(\w+)\}$/.exec(part);
    return match && Object.hasOwn(values, match[1]) ? values[match[1]] : part;
  });
}
