import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Mock OAuth endpoints that return WebDev format responses
app.post("/webdev.v1.WebDevAuthPublicService/ExchangeToken", async (req, res) => {
  const { code, redirectUri, clientId } = req.body;

  try {
    // In production, verify the code with actual OAuth provider (Google, etc)
    // For now, generate a mock token
    const accessToken = `mock_token_${Date.now()}`;
    const idToken = `mock_id_${Date.now()}`;

    return res.json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: 3600,
      idToken,
      scope: "openid profile email",
    });
  } catch (error) {
    console.error("ExchangeToken error:", error);
    return res.status(500).json({ error: "Failed to exchange token" });
  }
});

app.post("/webdev.v1.WebDevAuthPublicService/GetUserInfo", async (req, res) => {
  const { accessToken } = req.body;

  try {
    // Mock user info - in production this would query the OAuth provider
    return res.json({
      openId: `user_${accessToken.replace(/[^0-9]/g, "").substring(0, 10)}`,
      projectId: "intellimix",
      name: "Demo User",
      email: "user@example.com",
      platform: "google",
      loginMethod: "google",
    });
  } catch (error) {
    console.error("GetUserInfo error:", error);
    return res.status(500).json({ error: "Failed to get user info" });
  }
});

app.post("/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt", async (req, res) => {
  const { idToken } = req.body;

  try {
    return res.json({
      openId: `user_${idToken.replace(/[^0-9]/g, "").substring(0, 10)}`,
      projectId: "intellimix",
      name: "Demo User",
      email: "user@example.com",
    });
  } catch (error) {
    console.error("GetUserInfoWithJwt error:", error);
    return res.status(500).json({ error: "Failed to verify JWT" });
  }
});

app.listen(PORT, () => {
  console.log(`OAuth bridge listening on port ${PORT}`);
});
