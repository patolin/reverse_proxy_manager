import LogoutIcon from "@mui/icons-material/Logout";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { formatMessage, messages } from "../../messages.js";

export default function DashboardHeader({ username, onSignOut }) {
  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar>
        <Container maxWidth="lg" disableGutters sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">{messages.appName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatMessage(messages.signedInAs, { username })}
            </Typography>
          </Box>
          <Button startIcon={<LogoutIcon />} onClick={onSignOut}>{messages.signOut}</Button>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
