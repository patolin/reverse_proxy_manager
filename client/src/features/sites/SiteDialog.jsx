import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { messages } from "../../messages.js";

const emptySite = {
  name: "",
  host: "",
  backendService: "",
  backendPort: "3000",
  enabled: true,
};

export default function SiteDialog({ open, site, saving, error, onClose, onSave }) {
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
