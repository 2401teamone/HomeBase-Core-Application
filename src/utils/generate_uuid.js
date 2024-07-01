import crypto from "crypto";

export default function generateRandomUUID() {
  return crypto.randomBytes(7).toString("hex");
}
