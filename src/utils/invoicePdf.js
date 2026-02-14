// const PDFDocument = require("pdfkit");
// const fs = require("fs");
// const path = require("path");

// function generateInvoicePdf(purchase) {
//   const invoicesDir = path.join(process.cwd(), "invoices");

//   if (!fs.existsSync(invoicesDir)) {
//     fs.mkdirSync(invoicesDir);
//   }

//   const fileName = `invoice_${purchase.purchase_id}.pdf`;
//   const filePath = path.join(invoicesDir, fileName);

//   const doc = new PDFDocument({ margin: 40 });
//   doc.pipe(fs.createWriteStream(filePath));

//   /* ---------------- HEADER ---------------- */
//   doc
//     .fontSize(20)
//     .text("Purchase Invoice", { align: "center" })
//     .moveDown(1);

//   doc
//     .fontSize(10)
//     .text(`Invoice No: ${purchase.purchase_id}`)
//     .text(`Purchase Date: ${new Date(purchase.purchase_date).toLocaleString()}`)
//     .text(`Purchased For: ${purchase.purchase_for_mobile}`)
//     .text(`Purchased By: ${purchase.purchased_by_mobile}`)
//     .text(`Type: ${purchase.purchase_type}`)
//     .moveDown(1);

//   /* ---------------- PRODUCTS TABLE ---------------- */
//   doc.fontSize(12).text("Products", { underline: true }).moveDown(0.5);

//   purchase.products_json.forEach((p, index) => {
//     doc
//       .fontSize(10)
//       .text(
//         `${index + 1}. ${p.product_name}
//    Qty: ${p.quantity}
//    Price: ₹${p.price}
//    MRP: ₹${p.mrp}
//    Discount: ₹${p.discount}
//    GST: ${p.gst_percent}%`
//       )
//       .moveDown(0.5);
//   });

//   doc.moveDown(1);

//   /* ---------------- TOTALS ---------------- */
//   doc.fontSize(12).text("Summary", { underline: true }).moveDown(0.5);

//   doc.fontSize(10)
//     .text(`Total MRP: ₹${purchase.total_mrp}`)
//     .text(`Total Selling Price: ₹${purchase.total_selling_price}`)
//     .text(`Total Discount: ₹${purchase.total_discount}`)
//     .text(`Total GST: ₹${purchase.total_gst}`)
//     .text(`Total Saving: ₹${purchase.total_saving}`)
//     .moveDown(1);

//   doc
//     .fontSize(14)
//     .text(`Final Payable: ₹${purchase.total_selling_price}`, {
//       align: "right",
//     });

//   doc.moveDown(2);

//   doc
//     .fontSize(10)
//     .text("Thank you for shopping with us!", { align: "center" });

//   doc.end();

//   return `/invoices/${fileName}`;
// }

// module.exports = {
//   generateInvoicePdf,
// };

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generateInvoicePdf(purchase) {
  const invoicesDir = path.join(__dirname, "../../invoices");
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);

  const fileName = `invoice_${purchase.purchase_id}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  /* ================= HEADER ================= */
  doc.fontSize(22).text("TAX INVOICE", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text("Samridhhi Society", { align: "center" });
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Invoice No: ${purchase.purchase_id}`);
  doc.text(`Date: ${new Date(purchase.purchase_date).toLocaleString()}`);
  doc.text(`Purchased For: ${purchase.purchase_for_mobile}`);
  doc.text(`Purchased By: ${purchase.purchased_by_mobile}`);
  doc.text(`Type: ${purchase.purchase_type}`);
  doc.moveDown();

  /* ================= WATERMARK ================= */
  doc.save();
  doc.rotate(-30, { origin: [300, 400] });
  doc.fontSize(50).fillColor("green").opacity(0.15);
  doc.text("PAID", 150, 350);
  doc.restore();
  doc.opacity(1).fillColor("black");

  /* ================= TABLE HEADER ================= */
  const tableTop = doc.y + 20;
  const col = { name: 40, qty: 250, price: 300, gst: 360, total: 430 };

  doc.fontSize(11).font("Helvetica-Bold");
  doc.text("Product", col.name, tableTop);
  doc.text("Qty", col.qty, tableTop);
  doc.text("Price", col.price, tableTop);
  doc.text("GST", col.gst, tableTop);
  doc.text("Total", col.total, tableTop);

  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  /* ================= TABLE ROWS ================= */
  doc.font("Helvetica").fontSize(10);
  let y = tableTop + 25;

  purchase.products_json.forEach(p => {
    const gstAmount = (p.price * p.gst_percent / 100) * p.quantity;
    const lineTotal = (p.price * p.quantity) + gstAmount;

    doc.text(p.product_name, col.name, y, { width: 200 });
    doc.text(p.quantity, col.qty, y);
    doc.text(`₹${p.price}`, col.price, y);
    doc.text(`${p.gst_percent}%`, col.gst, y);
    doc.text(`₹${lineTotal.toFixed(2)}`, col.total, y);

    y += 20;
  });

  /* ================= TOTALS ================= */
  y += 10;
  doc.moveTo(300, y).lineTo(550, y).stroke();
  y += 10;

  doc.font("Helvetica-Bold");
  doc.text("Total MRP:", 350, y);
  doc.text(`₹${purchase.total_mrp}`, 450, y);

  y += 15;
  doc.text("Selling Price:", 350, y);
  doc.text(`₹${purchase.total_selling_price}`, 450, y);

  y += 15;
  doc.text("GST:", 350, y);
  doc.text(`₹${purchase.total_gst}`, 450, y);

  y += 15;
  doc.text("You Saved:", 350, y);
  doc.text(`₹${purchase.total_saving}`, 450, y);

  y += 20;
  doc.fontSize(14);
  doc.text("TOTAL PAYABLE:", 300, y);
  doc.text(`₹${purchase.total_selling_price}`, 450, y);

  doc.end();

  return `/invoices/${fileName}`;
}

module.exports = { generateInvoicePdf };

