// 

const express = require("express");
const router = express.Router();
// const { savePushToken } = require("../controllers/authController");

const {
  login,
  signup,
  employeeWallet,
  banners,
  createNewUser,
  getMyMembers,
  createProduct,
  getProductsForUpdate,
  getAllProducts,
  addProductToCart,
  viewCartItems,
  updateCartQuantity,
  deleteCartItem,
  checkoutCart,
  getPurchaseHistory,
  generateInvoice,
  searchMembers,
  transferCoin,
  getUserDetails,
  getHistory,
  createNotification,
  savePushToken,
  getNotifications,
  createLead,
  viewLeadsByStatus,
  updateLead
} = require("../controllers/authController");

router.post("/login", login);
router.post("/signup", signup);
router.post("/employee-wallet", employeeWallet);
router.post("/banners", banners);
router.post("/create-new-user", createNewUser);
router.post("/my-members", getMyMembers);
router.post("/create-product", createProduct);
router.post("/get-products-update", getProductsForUpdate);
router.post("/get-all-products", getAllProducts);
router.post("/add-to-cart", addProductToCart);
router.post("/view-cart-items", viewCartItems);
router.post("/update-cart-items", updateCartQuantity);
router.post("/delete-cart-items", deleteCartItem);
router.post("/checkout-cart", checkoutCart);
router.post("/purchase-history", getPurchaseHistory);
router.post("/generate-invoice", generateInvoice);
router.post("/search-members", searchMembers);
router.post("/transfer-coin", transferCoin);
router.post("/user-details", getUserDetails);
router.post("/get-history", getHistory);
router.post("/create", createNotification);
router.post("/save-push-token", savePushToken);
router.post("/notification/list", getNotifications);
router.post("/create-lead", createLead);
router.post("/view-leads", viewLeadsByStatus);
router.post("/update-lead", updateLead);











module.exports = router;
