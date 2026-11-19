import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { formatMessage, messages } from "../../messages.js";

export default function SiteCard({ site, deployment, busy, onEdit, onDelete, onToggle, onDeploy }) {
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
