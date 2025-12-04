export default function handler(req: any, res: any) {
  res.status(200).json({ 
    message: 'Test function works',
    method: req.method,
    query: req.query,
    url: req.url
  });
}

