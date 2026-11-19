import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { messages } from "../../messages.js";

export default function LoginView({ loading, error, onSubmit }) {
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
