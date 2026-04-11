export default async function handler(req, res) {
  var path = req.query.path || "branch_buildings";
  var url = "https://api.timp.pro/api/timp/v1/" + path;
  
  try {
    var r = await fetch(url, {
      headers: {
        "Api-Access-Key": process.env.TIMP_API_KEY,
        "Accept": "application/timp.timp-v1"
      }
    });
    var data = await r.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "TIMP API error" });
  }
}
