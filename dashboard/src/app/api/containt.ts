// pages/api/beschwerden.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const result = await pool.query('SELECT * FROM Beschwerde ORDER BY erstelltam DESC');
  res.status(200).json(result.rows);
}
