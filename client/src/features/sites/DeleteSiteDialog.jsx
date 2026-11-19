import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { formatMessage, messages } from "../../messages.js";

export default function DeleteSiteDialog({ site, busy, error, onClose, onConfirm }) {
  return (
    <Dialog open={Boolean(site)} onClose={onClose}>
      <DialogTitle>{messages.deleteSiteTitle}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <DialogContentText>
          {formatMessage(messages.deleteSiteHelp, { host: site?.host })}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy}>
          {messages.cancel}
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>
          {messages.deleteSite}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
