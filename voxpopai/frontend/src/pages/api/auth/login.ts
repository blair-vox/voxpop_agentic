import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ALB will handle the actual authentication
  // This endpoint just redirects to the ALB
  res.redirect(307, process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
} 