import * as express from 'express';
import { lowerCaseFormatMiddleware, validateFormatMiddleware } from './middleware';
import { getLastArtifactVersion, getArtifactDetailsUrl, getSearchByGaUrl, getDefinedArtifactVersion } from './services/mavenCentral';
import { getBadgeImage } from './services/shields';
import RedisClientWrapper from './services/redisClientWrapper';
import { AxiosStatic } from 'axios';

export const PATH_PREFIX = 'maven-central';

const DEFAULT_COLOR = 'brightgreen';
const NOT_FOUND_COLOR = 'lightgray';
const DEFAULT_SUBJECT = 'maven central';

export function createServer (axios: AxiosStatic, redisClient: RedisClientWrapper) {
  const app = express();

  app.get(`/${PATH_PREFIX}/:group/:artifact/badge.:format`, lowerCaseFormatMiddleware, validateFormatMiddleware, async (req, res) => {
    const { group, artifact, format } = req.params;
    const { subject, color, style, version } = req.query;
    const lastVersion = version
      ? await getDefinedArtifactVersion(axios, group, artifact, version).catch(() => 'unknown')
      : await getLastArtifactVersion(axios, group, artifact).catch(() => 'unknown');

    try {
      const badge = await getBadgeImage(axios, redisClient, subject || DEFAULT_SUBJECT, lastVersion, color || DEFAULT_COLOR, format, style);
      res.contentType(format).send(badge);
    } catch {
      res.status(500).end();
    }
  });
  
  app.get(`/${PATH_PREFIX}/:group/:artifact/last_version`, async (req, res) => {
    const { group, artifact } = req.params;
    try {
      const lastVersion = await getLastArtifactVersion(axios, group, artifact);
      res.send(lastVersion);
    } catch (error) {
      res.status(error.response.status).end();
    }
  });
  
  app.get(`/${PATH_PREFIX}/:group/:artifact/?`, async (req, res) => {
    const { group, artifact } = req.params;
    try {
      const lastVersion = await getLastArtifactVersion(axios, group, artifact);
      res.redirect(getArtifactDetailsUrl(group, artifact, lastVersion));
    } catch {
      res.redirect(getSearchByGaUrl(group, artifact));
    }
  });

  return app;
}
