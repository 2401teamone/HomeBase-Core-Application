import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  chmodSync,
} from "fs";
import { createServer } from "https";
import express from "express";
import { Client, directory, crypto } from "acme-client";
import { RecurrenceRule, scheduleJob } from "node-schedule";

class Server {
  constructor(expressApp, config) {
    this.certServer = this.#createCertServer();
    this.httpsServer;
    this.httpServer;
    this.httpRedirectServer;

    this.expressApp = expressApp;
    this.config = config;
    this.createAltNames();
    this.credentials;
    this.challengeCache = {};
  }

  createAltNames() {
    if (!this.config.altNames || !this.config.altNames.length) {
      this.config.altNames = [];
      this.config.altNames.push("www." + this.config.domain);
    }
  }

  /**
   * Public method to start the server based on the config object passed in.
   * @returns {undefined}
   */

  async start() {
    if (this.config.domain) {
      this.#startHttps();
    } else {
      this.#startHttp();
    }
  }

  /**
   * Starts a node https server and a redirect server
   * @returns {undefined}
   */

  async #startHttps() {
    await this.#getCredentials();

    this.httpRedirectServer = this.#createRedirectServer();
    this.httpRedirectServer.start();

    this.httpsServer = this.#createHttpsServer();
    this.httpsServer.start();
    this.#startCertRenewalJob();
  }

  /**
   * Starts an express server with no encryption
   * @returns {undefined}
   */

  async #startHttp() {
    this.httpServer = this.#createHttpServer();
    this.httpServer.start();
  }

  /**
   * Starts a node-schedule job to check the age if the certificate at 2am CST.
   * If within 30 days of expiration will attempt to get a new cert.
   * @returns {object}
   */

  async #startCertRenewalJob() {
    const rule = new RecurrenceRule();
    rule.minute = 0;
    rule.hour = 2;
    rule.tz = "Etc/GMT+5";

    return scheduleJob(rule, async () => {
      if (this.#needsRenewal(this.credentials.cert)) {
        await this.#getCert();

        this.credentials = this.#findCredentials();

        this.httpsServer.stop();
        this.httpsServer = this.#createHttpsServer();
        this.httpsServer.start();
      }
    });
  }

  /**
   * Gets the credentials, if they aren't found by findCredentials() or need renewal
   * call getCert() to issue new credentials from Let's Encrypt.
   * @returns {undefined}
   */

  #createHttpServer() {
    let httpServer = {};
    const app = this.expressApp;
    const port = this.config.port || 3000;

    httpServer.start = () => {
      httpServer.server = app.listen(port, () => {
        console.log(`\nServer started at: http://localhost:${port}`);
        console.log(`├─ REST API: http://localhost:${port}/api`);
        console.log(`└─ Admin UI: http://localhost:${port}/_/\n`);
      });
    };

    httpServer.stop = async () => {
      await httpServer.server.close();
    };

    return httpServer;
  }

  /**
   * Gets the credentials, if they aren't found by findCredentials() or need renewal
   * call getCert() to issue new credentials from Let's Encrypt.
   * @returns {undefined}
   */

  async #getCredentials() {
    let credentials = this.#findCredentials();

    if (!credentials || this.#needsRenewal(credentials.cert)) {
      await this.#getCert();
      credentials = this.#findCredentials();
    }
    this.credentials = credentials;
  }

  /**
   * Creates a node https server using the credentials and the express app passed in to the config object.
   * @returns {object} https.Server
   */
  #createHttpsServer() {
    let httpsServer = {};
    httpsServer.server = createServer(this.credentials, this.expressApp);

    httpsServer.start = () => {
      this.httpsServer.server.listen(443, () => {
        console.log("HTTPS server running on port 443");
      });
    };

    httpsServer.stop = () => {
      httpsServer.server.close();
    };

    return httpsServer;
  }

  /**
   * Creates an express server to redirect any traffic on port 80 to port 443
   * @returns {object} http.Server
   */

  #createRedirectServer() {
    let redirectServer = {};
    const redirectApp = express();

    redirectApp.get("*", (req, res) => {
      res.redirect("https://" + req.headers.host + req.url);
    });

    redirectServer.start = () => {
      redirectServer.server = redirectApp.listen(80, () => {
        console.log("Redirecting port 80 traffic to secure port 443.");
      });
    };
    redirectServer.stop = async () => {
      console.log("Closing redirect server");
      await redirectServer.server.close();
    };

    return redirectServer;
  }

  /**
   * Tries to get the server credentials, return undefined if unable to.
   * @returns {object} privatekey and certificate
   * @returns {undefined}
   */

  #findCredentials() {
    let key;
    let cert;
    try {
      key = readFileSync("pnpd_data/.cert/privkey.pem");
      cert = readFileSync("pnpd_data/.cert/fullchain.pem");
    } catch (e) {
      console.log("Either private key or cert is missing.");
      return undefined;
    }

    return { key, cert };
  }

  /**
   * Returns number of days between a given date object and the current day.
   * @param {object} Date object
   * @returns {int}
   */

  #daysUntil(date) {
    const today = new Date();
    const dateCopy = new Date(date.getTime());

    dateCopy.setUTCHours(0, 0, 0, 0);
    today.setUTCHours(0, 0, 0, 0);

    const diff = dateCopy - today;

    // returns the diff as days
    return diff / (1000 * 60 * 60 * 24);
  }

  /**
   * Check if certificate is within 30 days of its expiration date
   * @param {object} certificate.pem
   * @returns {bool}
   */
  #needsRenewal(cert) {
    const certObj = crypto.readCertificateInfo(cert);
    return this.#daysUntil(certObj.notAfter) < 31;
  }

  /**
   * Method to fetch certificate from Let's Encrypt. First stops the redirect server
   * running on port 80, then starts a server to listen for the challenge from Let's Encrypt.
   * Restarts redirect server when done.
   *
   * @returns {undefined}
   */
  async #getCert() {
    if (this.httpRedirectServer) {
      await this.httpRedirectServer.stop();
    }
    this.certServer.start();

    /* Init client */
    const client = new Client({
      // uncomment this for production
      // directoryUrl: directory.letsencrypt.production,
      directoryUrl: directory.letsencrypt.staging,
      accountKey: await crypto.createPrivateKey(),
    });

    /* Create CSR */
    const [key, csr] = await crypto.createCsr({
      commonName: this.config.domain,
      altNames: this.config.altNames,
    });

    /* Certificate */
    const cert = await client.auto({
      csr,
      termsOfServiceAgreed: true,
      challengeCreateFn: this.#challengeCreateFn.bind(this),
      challengeRemoveFn: this.#challengeRemoveFn.bind(this),
    });

    console.log("Obtained new certificate from Let's Encrypt");
    if (!existsSync("pnpd_data/.cert")) {
      mkdirSync("pnpd_data/.cert", { recursive: true });
    }

    writeFileSync("pnpd_data/.cert/privkey.pem", key);
    chmodSync("pnpd_data/.cert/privkey.pem", 0o600);

    writeFileSync("pnpd_data/.cert/fullchain.pem", cert);
    chmodSync("pnpd_data/.cert/fullchain.pem", 0o644);

    this.certServer.stop();
    if (this.httpRedirectServer) {
      this.httpRedirectServer.start();
    }
  }

  /**
   * Creates a server to listen on port 80 and respond to Let's Encrypt's
   * challenge.
   *
   * @returns {object} http.Server
   */
  #createCertServer() {
    let certServer = {};
    const certApp = express();

    certApp.get("/.well-known/acme-challenge/:token", (req, res) => {
      res.send(this.challengeCache[req.params.token]);
    });

    certServer.start = () => {
      certServer.server = certApp.listen(80, async () => {
        console.log("Listening for challenges from Let's Encrypt");
      });
    };
    certServer.stop = async () => {
      console.log("Closing certificate challenge server");
      await certServer.server.close();
    };

    return certServer;
  }

  /**
   * Adds challenge.token and keyAuth to the challengeCache to serve as the
   * Let's Encrypt challenge.
   *
   * @param {object} authz Authorization object
   * @param {object} challenge Selected challenge
   * @param {string} keyAuthorization Authorization key
   * @returns {Promise}
   */

  async #challengeCreateFn(authz, challenge, keyAuthorization) {
    console.log("Challenge recieved from Let's Encrypt");

    /* http-01 */
    if (challenge.type === "http-01") {
      this.challengeCache[challenge.token] = keyAuthorization;
    }
  }

  /**
   * Removes challenge.token and keyAuth from challengeCache after the
   * challenge has been satisfied.
   *
   * @param {object} authz Authorization object
   * @param {object} challenge Selected challenge
   * @param {string} keyAuthorization Authorization key
   * @returns {Promise}
   */

  async #challengeRemoveFn(authz, challenge) {
    console.log("Cleaning up challenge");

    /* http-01 */
    if (challenge.type === "http-01") {
      delete this.challengeCache[challenge.token];
    }
  }
}

export default Server;
// const app = express();

// app.get("/", (req, res) => {
//   res.send("Hi, this is seal!");
// });

// let server = new Server(this.expressApp, this.config);
// server.start();
