const pool = require("../config/db");
const { generateInvoicePdf } = require("../utils/invoicePdf");


const generateInvoice = async (req, res) => {
  try {
    const { purchase_id } = req.body;

    if (!purchase_id) {
      return res.status(400).json({
        status: false,
        message: "purchase_id is required",
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM tb_product_purchese_master WHERE purchase_id = $1`,
      [purchase_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Purchase not found",
      });
    }

    const pdfUrl = generateInvoicePdf(rows[0]);

    return res.json({
      status: true,
      pdf_url: pdfUrl,
    });
  } catch (error) {
    console.error("Invoice Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports.generateInvoice = generateInvoice;

const login = async (req, res) => {
  try {
    const { mobile, password } = req.body;
console.log("Login attempt:", { mobile, password: password ? "****" : null });
    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and password are required"
      });
    }

    const query = `
      SELECT * FROM public.fn_login_auth_user($1, $2)
    `;

    const values = [mobile, password];

    const { rows } = await pool.query(query, values);

    // fn returns exactly ONE row
    const result = rows[0];

    return res.json(result);

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

const signup = async (req, res) => {
  try {
    const {
      mobile,
      password,
      name,
      employee_id = null,
      type = "CUSTOMER"
    } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and password are required"
      });
    }

    const query = `
      SELECT * FROM public.fn_signup_auth_user($1, $2, $3, $4, $5)
    `;

    const values = [
      mobile,
      password,
      name,
      employee_id,
      type
    ];

    const { rows } = await pool.query(query, values);

    const result = rows[0];

    return res.json(result);

  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

const employeeWallet = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required"
      });
    }

    const query = `
      SELECT * FROM public.sp_mb_get_employee_wallet($1)
    `;

    const values = [mobile];

    const { rows } = await pool.query(query, values);

    // fn returns exactly ONE row
    const result = rows[0];

    // console.log("Employee wallet result:", result);

    return res.json(result);

  } catch (error) {
    console.error("Employee wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

const banners = async (req, res) => {
  try {
    const query = `
      SELECT * FROM public.sp_mb_get_banners()
    `;

    const { rows } = await pool.query(query);

    // console.log("Banner rows:", rows);

    // ✅ RETURN LIST (ARRAY)
    return res.json(rows);

  } catch (error) {
    console.error("Employee banner error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const createNewUser = async (req, res) => {
  try {
    const {
      full_name,
      mobile_number,
      password,
      role,
      type,
      email,
      area,
      address,
      pin_code,
      city,
      state,
      lat,
      long,
      supervisor_name,
      supervisor_mobile,
      father_name
    } = req.body;
      console.log("Creating new user with data:", req.body);
    const result = await pool.query(
      `SELECT public.sp_mb_create_new_user(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )`,
      [
        full_name,
        mobile_number,
        password,
        role,
        type,
        email,
        area,
        address,
        pin_code,
        city,
        state,
        lat,
        long,
        supervisor_name,
        supervisor_mobile,
        father_name
      ]
    );
    console.log("Create new user result:", result);
    return res.json(result.rows[0].sp_mb_create_new_user);

  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};

const getMyMembers = async (req, res) => {
  try {
    const { supervisor_mobile, search } = req.body;

    const result = await pool.query(
      `SELECT public.sp_mb_get_my_members($1,$2)`,
      [supervisor_mobile, search || null]
    );

    return res.json(result.rows[0].sp_mb_get_my_members);

  } catch (error) {
    console.error("Get Members Error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};

const createProduct = async function createProduct(req, res) {
  try {
    const body = req.body; // ✅ DEFINE BODY

    const result = await pool.query(
      `SELECT * FROM sp_mb_create_new_product(
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19
      )`,
      [
        body.product_name,
        body.product_type,
        body.product_quantity,
        body.product_price,
        body.product_mrp,
        body.product_gst_percent,
        body.product_discount,
        body.mobile_number,
        body.text_1,
        body.text_2,
        body.text_3,
        body.text_4,
        body.product_brand,
        body.product_sub_brand,
        body.product_area,
        body.product_gst,
        body.product_image,
        body.product_image2,
        body.product_image3
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Create Product Error:", err);
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
}

const getProductsForUpdate = async (req, res) => {
  try {
    const { mobile_number, product_name } = req.body;

    const result = await pool.query(
      `SELECT * FROM sp_mb_get_product_update($1, $2)`,
      [mobile_number, product_name || null]
    );

    return res.json({
      status: true,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};


const getAllProducts = async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      product_type = null,
    } = req.body;

    const { rows } = await pool.query(
      `
        SELECT * FROM sp_mb_get_all_products(
          $1,
          $2,
          $3
        )
      `,
      [
        parseInt(limit),
        parseInt(offset),
        product_type,
      ]
    );

    return res.status(200).json({
      status: true,
      message: "Products fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

const addProductToCart = async (req, res) => {
  console.log("ADD TO CART REQ:", req.body);
  try {
    const { mobile_number, product_id, quantity } = req.body;

    console.log("ADD TO CART REQ:", req.body);

    if (!mobile_number || !product_id || quantity == null) {
      return res.status(400).json({
        status: false,
        message: "mobile_number, product_id and quantity are required",
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM sp_mb_cart_add_product($1,$2,$3)`,
      [
        mobile_number,
        product_id.toString(),
        Number(quantity),
      ]
    );
console.log("ADD TO CART REQ:", res.body);
    return res.status(200).json(rows[0].sp_mb_cart_add_product);

  } catch (error) {
    console.error("Add To Cart Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const viewCartItems = async (req, res) => {
  try {
    const { mobile_number } = req.body;

    if (!mobile_number) {
      return res.status(400).json({
        status: false,
        message: "mobile_number is required",
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM sp_mb_cart_view_product($1)`,
      [mobile_number]
    );
     
    return res.status(200).json({
      status: true,
      message: "Cart items fetched successfully",
      data: rows,
    });

  } catch (error) {
    console.error("View Cart Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch cart items",
      error: error.message,
    });
  }
};



const updateCartQuantity = async (req, res) => {
  try {
    const { mobile_number, product_id, quantity } = req.body;

    if (!mobile_number || !product_id || quantity === undefined) {
      return res.status(400).json({
        status: false,
        message: "mobile_number, product_id and quantity are required",
      });
    }

    const { rows } = await pool.query(
      `SELECT sp_mb_cart_update_product_quantity($1, $2, $3) AS result`,
      [mobile_number, product_id, quantity]
    );

    return res.status(200).json(rows[0].result);

  } catch (error) {
    console.error("Update Cart Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update cart",
      error: error.message,
    });
  }
};


const deleteCartItem = async (req, res) => {
  try {
    const { mobile_number, product_id } = req.body;

    if (!mobile_number || !product_id) {
      return res.status(400).json({
        status: false,
        message: "mobile_number and product_id are required",
      });
    }

    const { rows } = await pool.query(
      `SELECT sp_mb_cart_delete_item($1, $2) AS result`,
      [mobile_number, product_id]
    );

    return res.status(200).json(rows[0].result);

  } catch (error) {
    console.error("Delete Cart Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to delete cart item",
      error: error.message,
    });
  }
};

const checkoutCart = async (req, res) => {
  try {
    const {
      purchase_for_mobile,
      purchased_by_mobile,
      purchase_type,
    } = req.body;

    const { rows } = await pool.query(
      `SELECT sp_mb_purchase_product($1,$2,$3) AS result`,
      [purchase_for_mobile, purchased_by_mobile, purchase_type]
    );

    return res.json(rows[0].result);
  } catch (error) {
    console.error("Checkout Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
const getPurchaseHistory = async (req, res) => {
  try {
    const { mobile_number } = req.body;

    const { rows } = await pool.query(
      `SELECT * FROM sp_mb_purchase_history($1)`,
      [mobile_number]
    );

    return res.json({
      status: true,
      data: rows,
    });
  } catch (error) {
    console.error("Purchase History Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const searchMembers = async (req, res) => {
  try {
    const {
      requester_mobile,
      scope,        // TEAM | ALL
      search_type,  // NAME | MOBILE
      search_text
    } = req.body;

    const { rows } = await pool.query(
      `SELECT * FROM sp_mb_search_members_v2($1, $2, $3, $4)`,
      [requester_mobile, scope, search_type, search_text]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (e) {
    console.error("Search Members Error:", e);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

const transferCoin = async (req, res) => {
  try {
    const {
      sender_mobile_number,
      receiver_mobile_number,
      amount,
    } = req.body;

    if (!sender_mobile_number || !receiver_mobile_number || !amount) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM sp_mb_transfer_coin($1,$2,$3)`,
      [sender_mobile_number, receiver_mobile_number, amount]
    );

    const result = rows[0].sp_mb_transfer_coin;

    res.json(result); // returning same JSON from function
  } catch (error) {
    console.error("Transfer Coin Error:", error);
    res.status(500).json({
      success: false,
      message: "Transfer failed",
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { mobile } = req.body;
    console.log(req.body);
    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required"
      });
    }

    const query = `
      SELECT * FROM public.sp_mb_get_user_details($1)
    `;

    const values = [mobile];

    const { rows } = await pool.query(query, values);

    const result = rows[0];
    console.log(res.json(result));
    return res.json(result);

  } catch (error) {
    console.error("Get User Details error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};




module.exports = {
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
  getUserDetails


};
