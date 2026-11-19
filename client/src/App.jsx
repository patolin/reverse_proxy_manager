import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { ApiError, apiRequest, getCurrentUser } from "./api.js";
import { formatMessage, messageParts, messages } from "./messages.js";

const emptySite = {
  name: "",
  host: "",
  backendService: "",
  backendPort: "3000",
  enabled: true,
};

function SiteDialog({ open, site, saving, error, onClose, onSave }) {
  const [values, setValues] = useState(emptySite);

  useEffect(() => {
    setValues(
      site
        ? {
            name: site.name,
            host: site.host,
            backendService: site.backendService,
            backendPort: String(site.backendPort),
            enabled: site.enabled,
          }
        : emptySite,
    );
  }, [site, open]);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSave({
      name: values.name,
      host: values.host,
      backendService: values.backendService,
      backendPort: Number(values.backendPort),
      enabled: values.enabled,
    });
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{site ? messages.editSite : messages.addSiteDialog}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              label={messages.siteName}
              name="name"
              value={values.name}
              onChange={updateField}
              inputProps={{ maxLength: 80 }}
            />
            <TextField
              required
              fullWidth
              label={messages.publicHost}
              name="host"
              value={values.host}
              onChange={updateField}
              helperText={messages.publicHostHelp}
            />
            <TextField
              required
              fullWidth
              label={messages.containerService}
              name="backendService"
              value={values.backendService}
              onChange={updateField}
              helperText={messages.containerServiceHelp}
            />
            <TextField
              required
              fullWidth
              type="number"
              label={messages.internalPort}
              name="backendPort"
              value={values.backendPort}
              onChange={updateField}
              inputProps={{ min: 1, max: 65535, step: 1 }}
            />
            {site && (
              <FormControlLabel
                control={
                  <Switch
                    checked={values.enabled}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, enabled: event.target.checked }))
                    }
                  />
                }
                label={messages.routeEnabled}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>{messages.cancel}</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? messages.saving : site ? messages.saveChanges : messages.createSite}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function SiteCard({ site, deployment, busy, onEdit, onDelete, onToggle, onDeploy }) {
  const deploymentActive = deployment?.status === "queued" || deployment?.status === "running";
  const deploymentColor = {
    queued: "default",
    running: "info",
    succeeded: "success",
    failed: "error",
  }[deployment?.status] ?? "default";

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="h2" noWrap>{site.name}</Typography>
            <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {site.host}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={site.enabled ? "success" : "default"}
            label={site.enabled ? messages.enabled : messages.disabled}
            variant={site.enabled ? "filled" : "outlined"}
          />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {messages.backend}
        </Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>
          {site.backendService}:{site.backendPort}
        </Typography>
        {deployment && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">{messages.latestDeployment}</Typography>
              <Chip
                size="small"
                color={deploymentColor}
                label={Object.hasOwn(messages.deploymentStatuses, deployment.status)
                  ? messages.deploymentStatuses[deployment.status]
                  : deployment.status}
                variant={deployment.status === "queued" ? "outlined" : "filled"}
              />
            </Stack>
            {deployment.error && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {deployment.error}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, justifyContent: "space-between" }}>
        <FormControlLabel
          control={
            <Switch
              checked={site.enabled}
              disabled={busy || deploymentActive}
              onChange={(event) => onToggle(site, event.target.checked)}
              inputProps={{ "aria-label": formatMessage(messages.enableRouteFor, { name: site.name }) }}
            />
          }
          label={messages.route}
        />
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={() => onDeploy(site)} disabled={busy || deploymentActive}>
            {messages.deploy}
          </Button>
          <IconButton aria-label={formatMessage(messages.editNamed, { name: site.name })} onClick={() => onEdit(site)} disabled={busy || deploymentActive}>
            <EditOutlinedIcon />
          </IconButton>
          <IconButton aria-label={formatMessage(messages.deleteNamed, { name: site.name })} onClick={() => onDelete(site)} disabled={busy || deploymentActive}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      </CardActions>
    </Card>
  );
}

function DeploymentDialog({ open, site, previous, busy, error, onClose, onSubmit }) {
  const [values, setValues] = useState({
    repository: "",
    branch: "main",
    composeFile: "compose.yaml",
  });

  useEffect(() => {
    if (!open) return;
    setValues({
      repository: previous?.repository ?? "",
      branch: previous?.branch ?? "main",
      composeFile: previous?.composeFile ?? "compose.yaml",
    });
  }, [open, site?.id]);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{formatMessage(messages.deployFromGitHub, { name: site?.name })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            <Alert severity="warning">
              {messages.deploymentWarning}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {messageParts(messages.deploymentNetworkHelp, {
                service: <strong key="service">{site?.backendService}</strong>,
                network: <code key="network">reverse-proxy-manager-proxy</code>,
              })}
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              required
              fullWidth
              label={messages.repositoryUrl}
              name="repository"
              value={values.repository}
              onChange={updateField}
              placeholder={messages.repositoryPlaceholder}
            />
            <TextField
              required
              fullWidth
              label={messages.branch}
              name="branch"
              value={values.branch}
              onChange={updateField}
            />
            <TextField
              required
              fullWidth
              label={messages.composeFile}
              name="composeFile"
              value={values.composeFile}
              onChange={updateField}
              helperText={messages.composeFileHelp}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={busy}>{messages.cancel}</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? messages.queueing : messages.queueDeployment}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function LoginView({ loading, error, onSubmit }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const signedIn = await onSubmit(username, password);
      if (signedIn) setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 10 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="primary">{messages.controlPanel}</Typography>
            <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>{messages.signIn}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {messages.signInHelp}
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2.5}>
              <TextField
                required
                fullWidth
                autoComplete="username"
                label={messages.username}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <TextField
                required
                fullWidth
                type="password"
                autoComplete="current-password"
                label={messages.password}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || submitting}
              >
                {submitting ? messages.signingIn : messages.signIn}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [siteVersion, setSiteVersion] = useState(0);
  const [deployments, setDeployments] = useState([]);
  const [deploymentVersion, setDeploymentVersion] = useState(0);
  const [editingSite, setEditingSite] = useState(null);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [deployingSite, setDeployingSite] = useState(null);
  const [queueingDeployment, setQueueingDeployment] = useState(false);
  const [busySiteId, setBusySiteId] = useState(null);
  const [deletingSite, setDeletingSite] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSites([]);
      setLoadingSites(false);
      return undefined;
    }

    let active = true;
    setLoadingSites(true);
    apiRequest("/api/sites")
      .then((result) => {
        if (active) setSites(result.sites);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          setUser(null);
          setError(messages.sessionExpired);
          return;
        }
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoadingSites(false);
      });

    return () => {
      active = false;
    };
  }, [user, siteVersion]);

  useEffect(() => {
    if (!user) {
      setDeployments([]);
      return undefined;
    }

    let active = true;
    let timer;
    async function refreshDeployments() {
      try {
        const result = await apiRequest("/api/deployments");
        if (!active) return;
        setDeployments(result.deployments);
        if (result.deployments.some(({ status }) => status === "queued" || status === "running")) {
          timer = setTimeout(refreshDeployments, 3000);
        }
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          setUser(null);
          setError(messages.sessionExpired);
          return;
        }
        setError(requestError.message);
      }
    }

    refreshDeployments();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [user, deploymentVersion]);

  function handleRequestError(requestError) {
    if (requestError instanceof ApiError && requestError.status === 401) {
      setUser(null);
      setError(messages.sessionExpired);
      return;
    }
    setError(requestError.message);
  }

  async function login(username, password) {
    setError("");
    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
      setUser(result.user);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      setUser(null);
      setError("");
    } catch (requestError) {
      handleRequestError(requestError);
    }
  }

  async function saveSite(values) {
    setSavingSite(true);
    setError("");
    try {
      await apiRequest(
        editingSite ? `/api/sites/${editingSite.id}` : "/api/sites",
        { method: editingSite ? "PUT" : "POST", body: values },
      );
      setSiteDialogOpen(false);
      setEditingSite(null);
      setSiteVersion((version) => version + 1);
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setSavingSite(false);
    }
  }

  async function toggleSite(site, enabled) {
    setBusySiteId(site.id);
    setError("");
    try {
      await apiRequest(`/api/sites/${site.id}`, {
        method: "PUT",
        body: {
          name: site.name,
          host: site.host,
          backendService: site.backendService,
          backendPort: site.backendPort,
          enabled,
        },
      });
      setSiteVersion((version) => version + 1);
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setBusySiteId(null);
    }
  }

  async function deleteSite() {
    if (!deletingSite) return;
    setBusySiteId(deletingSite.id);
    setError("");
    try {
      await apiRequest(`/api/sites/${deletingSite.id}`, { method: "DELETE" });
      setDeletingSite(null);
      setSiteVersion((version) => version + 1);
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setBusySiteId(null);
    }
  }

  async function queueDeployment(values) {
    if (!deployingSite) return;
    setQueueingDeployment(true);
    setError("");
    try {
      await apiRequest(`/api/sites/${deployingSite.id}/deployments`, {
        method: "POST",
        body: values,
      });
      setDeployingSite(null);
      setDeploymentVersion((version) => version + 1);
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setQueueingDeployment(false);
    }
  }

  function openCreateDialog() {
    setError("");
    setEditingSite(null);
    setSiteDialogOpen(true);
  }

  function openEditDialog(site) {
    setError("");
    setEditingSite(site);
    setSiteDialogOpen(true);
  }

  function openDeploymentDialog(site) {
    setError("");
    setDeployingSite(site);
  }

  const latestDeploymentBySite = new Map();
  for (const deployment of deployments) {
    if (!latestDeploymentBySite.has(deployment.siteId)) {
      latestDeploymentBySite.set(deployment.siteId, deployment);
    }
  }

  if (checkingAuth) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress aria-label={messages.checkingSession} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {user ? (
        <>
          <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Toolbar>
              <Container maxWidth="lg" disableGutters sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">{messages.appName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatMessage(messages.signedInAs, { username: user.username })}
                  </Typography>
                </Box>
                <Button startIcon={<LogoutIcon />} onClick={logout}>{messages.signOut}</Button>
              </Container>
            </Toolbar>
          </AppBar>
          <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h4" component="h1">{messages.sites}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {messages.sitesHelp}
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                  {messages.addSite}
                </Button>
              </Stack>
              {error && (
                <Alert severity="error" closeText={messages.close} onClose={() => setError("")}>
                  {error}
                </Alert>
              )}
              {loadingSites ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
                  <CircularProgress aria-label={messages.loadingSites} />
                </Box>
              ) : sites.length === 0 ? (
                <Paper variant="outlined" sx={{ p: { xs: 4, sm: 7 }, textAlign: "center" }}>
                  <Typography variant="h6">{messages.noSites}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                    {messages.noSitesHelp}
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                    {messages.createFirstSite}
                  </Button>
                </Paper>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                    gap: 2,
                  }}
                >
                  {sites.map((site) => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      deployment={latestDeploymentBySite.get(site.id)}
                      busy={busySiteId === site.id}
                      onEdit={openEditDialog}
                      onDelete={(selectedSite) => {
                        setError("");
                        setDeletingSite(selectedSite);
                      }}
                      onToggle={toggleSite}
                      onDeploy={openDeploymentDialog}
                    />
                  ))}
                </Box>
              )}
            </Stack>
          </Container>
        </>
      ) : (
        <LoginView loading={checkingAuth} error={error} onSubmit={login} />
      )}

      <SiteDialog
        open={siteDialogOpen}
        site={editingSite}
        saving={savingSite}
        error={error}
        onClose={() => {
          setSiteDialogOpen(false);
          setEditingSite(null);
          setError("");
        }}
        onSave={saveSite}
      />

      <DeploymentDialog
        open={Boolean(deployingSite)}
        site={deployingSite}
        previous={deployingSite ? latestDeploymentBySite.get(deployingSite.id) : undefined}
        busy={queueingDeployment}
        error={error}
        onClose={() => {
          setDeployingSite(null);
          setError("");
        }}
        onSubmit={queueDeployment}
      />

      <Dialog
        open={Boolean(deletingSite)}
        onClose={() => {
          setDeletingSite(null);
          setError("");
        }}
      >
        <DialogTitle>{messages.deleteSiteTitle}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <DialogContentText>
            {formatMessage(messages.deleteSiteHelp, { host: deletingSite?.host })}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => {
              setDeletingSite(null);
              setError("");
            }}
            disabled={busySiteId !== null}
          >
            {messages.cancel}
          </Button>
          <Button color="error" variant="contained" onClick={deleteSite} disabled={busySiteId !== null}>
            {messages.deleteSite}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
