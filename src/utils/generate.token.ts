import * as jwt from "jsonwebtoken";
import type { Response } from "express";

interface ITokens {
  accessToken: string;
  refreshToken: string;
}

const generateTokens = (
  userId: string, 
  res?: Response
): ITokens => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets not configured");
  }

  // 1. Generate tokens
  const accessToken = jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: process.env.USER_ACCESS_TOKEN_EXPIRATION_TIME || "15m" 
    }
  );

  const refreshToken = jwt.sign(
    { userId }, 
    process.env.JWT_REFRESH_SECRET, // Different secret for refresh tokens
    { 
      expiresIn: process.env.USER_REFRESH_TOKEN_EXPIRATION_TIME || "7d" 
    }
  );

  // 2. Set HTTP-only cookie (if response object provided)
  if (res) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // Protection against CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // Match refresh token expiration
      path: "/auth/refresh", // Only send to refresh endpoint
    });
  }

  return { accessToken, refreshToken };
};

export default generateTokens;