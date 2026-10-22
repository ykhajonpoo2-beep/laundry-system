const QRCode = require("qrcode");

const url = "https://laundry-system-git-feature-omise-yuthapong-s-projects.vercel.app/";

QRCode.toFile(
  "./public/home-qr.png",
  url,
  {
    width: 800,
    margin: 2,
  },
  function (err) {
    if (err) throw err;
    console.log("QR Code Created!");
  }
);