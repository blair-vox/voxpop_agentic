import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ALB adds user info in headers
  const userInfo = {
    email: req.headers['x-amzn-oidc-identity'] || req.headers['x-amzn-oidc-data'],
    // Add any other user info from ALB headers
  };

  if (!userInfo.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.status(200).json(userInfo);
} 