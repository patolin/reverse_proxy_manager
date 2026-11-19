import AddIcon from "@mui/icons-material/Add";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { messages } from "../../messages.js";
import SiteCard from "./SiteCard.jsx";

export default function SiteList({
  sites,
  loading,
  latestDeploymentBySite,
  busySiteId,
  onCreate,
  onEdit,
  onDelete,
  onToggle,
  onDeploy,
}) {
  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress aria-label={messages.loadingSites} />
      </Box>
    );
  }

  if (sites.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 4, sm: 7 }, textAlign: "center" }}>
        <Typography variant="h6">{messages.noSites}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          {messages.noSitesHelp}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
          {messages.createFirstSite}
        </Button>
      </Paper>
    );
  }

  return (
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
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onDeploy={onDeploy}
        />
      ))}
    </Box>
  );
}
