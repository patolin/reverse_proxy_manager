import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatMessage, messageParts, messages } from "../../messages.js";

export default function DeploymentDialog({ open, site, previous, busy, error, onClose, onSubmit }) {
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
