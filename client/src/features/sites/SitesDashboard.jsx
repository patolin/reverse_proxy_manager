import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import { apiRequest } from "../../api.js";
import { messages } from "../../messages.js";
import DashboardHeader from "./DashboardHeader.jsx";
import DeleteSiteDialog from "./DeleteSiteDialog.jsx";
import DeploymentDialog from "./DeploymentDialog.jsx";
import SiteDialog from "./SiteDialog.jsx";
import SiteList from "./SiteList.jsx";

export default function SitesDashboard({ username, error, onSignOut, onClearError, onRequestError }) {
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
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

  useEffect(() => {
    let active = true;
    setLoadingSites(true);
    apiRequest("/api/sites")
      .then((result) => {
        if (active) setSites(result.sites);
      })
      .catch((requestError) => {
        if (active) onRequestError(requestError);
      })
      .finally(() => {
        if (active) setLoadingSites(false);
      });

    return () => {
      active = false;
    };
  }, [siteVersion, onRequestError]);

  useEffect(() => {
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
        if (active) onRequestError(requestError);
      }
    }

    refreshDeployments();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [deploymentVersion, onRequestError]);

  async function saveSite(values) {
    setSavingSite(true);
    onClearError();
    try {
      await apiRequest(
        editingSite ? `/api/sites/${editingSite.id}` : "/api/sites",
        { method: editingSite ? "PUT" : "POST", body: values },
      );
      setSiteDialogOpen(false);
      setEditingSite(null);
      setSiteVersion((version) => version + 1);
    } catch (requestError) {
      onRequestError(requestError);
    } finally {
      setSavingSite(false);
    }
  }

  async function toggleSite(site, enabled) {
    setBusySiteId(site.id);
    onClearError();
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
      onRequestError(requestError);
    } finally {
      setBusySiteId(null);
    }
  }

  async function deleteSite() {
    if (!deletingSite) return;
    setBusySiteId(deletingSite.id);
    onClearError();
    try {
      await apiRequest(`/api/sites/${deletingSite.id}`, { method: "DELETE" });
      setDeletingSite(null);
      setSiteVersion((version) => version + 1);
    } catch (requestError) {
      onRequestError(requestError);
    } finally {
      setBusySiteId(null);
    }
  }

  async function queueDeployment(values) {
    if (!deployingSite) return;
    setQueueingDeployment(true);
    onClearError();
    try {
      await apiRequest(`/api/sites/${deployingSite.id}/deployments`, {
        method: "POST",
        body: values,
      });
      setDeployingSite(null);
      setDeploymentVersion((version) => version + 1);
    } catch (requestError) {
      onRequestError(requestError);
    } finally {
      setQueueingDeployment(false);
    }
  }

  function openCreateDialog() {
    onClearError();
    setEditingSite(null);
    setSiteDialogOpen(true);
  }

  function openEditDialog(site) {
    onClearError();
    setEditingSite(site);
    setSiteDialogOpen(true);
  }

  function openDeploymentDialog(site) {
    onClearError();
    setDeployingSite(site);
  }

  function openDeleteDialog(site) {
    onClearError();
    setDeletingSite(site);
  }

  const latestDeploymentBySite = new Map();
  for (const deployment of deployments) {
    if (!latestDeploymentBySite.has(deployment.siteId)) {
      latestDeploymentBySite.set(deployment.siteId, deployment);
    }
  }

  return (
    <>
      <DashboardHeader username={username} onSignOut={onSignOut} />
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
            <Alert severity="error" closeText={messages.close} onClose={onClearError}>
              {error}
            </Alert>
          )}
          <SiteList
            sites={sites}
            loading={loadingSites}
            latestDeploymentBySite={latestDeploymentBySite}
            busySiteId={busySiteId}
            onCreate={openCreateDialog}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onToggle={toggleSite}
            onDeploy={openDeploymentDialog}
          />
        </Stack>
      </Container>

      <SiteDialog
        open={siteDialogOpen}
        site={editingSite}
        saving={savingSite}
        error={error}
        onClose={() => {
          setSiteDialogOpen(false);
          setEditingSite(null);
          onClearError();
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
          onClearError();
        }}
        onSubmit={queueDeployment}
      />
      <DeleteSiteDialog
        site={deletingSite}
        busy={busySiteId !== null}
        error={error}
        onClose={() => {
          setDeletingSite(null);
          onClearError();
        }}
        onConfirm={deleteSite}
      />
    </>
  );
}
