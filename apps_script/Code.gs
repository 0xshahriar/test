const SPREADSHEET_ID = '16Mh-SI3sMb61qg0mkd46numaHoOCWo1VeD2KI3Q2tXs';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const ORIGIN = '*'; // Update to your front-end origin once deployed.
const PASSWORD_SALT = 'Test123';
const SCRIPT_TIMEZONE = Session.getScriptTimeZone() || 'Etc/UTC';

const RATE_LIMIT_MESSAGES = {
  login: 'Too many login attempts. Please wait a few minutes and try again.',
  signup: 'Too many signup attempts. Please try again later.',
  adminLogin: 'Too many admin login attempts. Please wait and try again.',
  adminSignup: 'Too many admin signup attempts. Please try again later.'
};

const RATE_LIMIT_CONFIG = {
  login: { limit: 5, windowSeconds: 60 * 5 },
  signup: { limit: 5, windowSeconds: 60 * 60 },
  adminLogin: { limit: 5, windowSeconds: 60 * 5 },
  adminSignup: { limit: 5, windowSeconds: 60 * 60 }
};

function doGet(e) {
  return handleRequest('GET', e);
}

function doPost(e) {
  if (e && e.parameter && e.parameter._method === 'OPTIONS') {
    return createResponse({ ok: true });
  }
  return handleRequest('POST', e);
}

function handleRequest(method, e) {
  try {
    const payload = parsePayload(method, e);
    const action = (payload.action || '').toString();
    const token = payload.token || '';

    switch (action) {
      case 'signup':
        return createResponse(handleSignup(payload));
      case 'login':
        return createResponse(handleLogin(payload));
      case 'adminSignup':
        return createResponse(handleAdminSignup(payload));
      case 'adminLogin':
        return createResponse(handleAdminLogin(payload));
      case 'forgotPassword':
        return createResponse(handleForgotPassword(payload));
      case 'resetPassword':
        return createResponse(handleResetPassword(payload));
      case 'verifyEmail':
        return createResponse(handleVerifyEmail(payload));
      case 'listProducts':
        return createResponse(handleListProducts(payload));
      case 'getProduct':
        return createResponse(handleGetProduct(payload));
      case 'addProduct':
        return createResponse(requireRole(token, ['admin'], handleAddProduct, payload));
      case 'updateProduct':
        return createResponse(requireRole(token, ['admin'], handleUpdateProduct, payload));
      case 'deleteProduct':
        return createResponse(requireRole(token, ['admin'], handleDeleteProduct, payload));
      case 'createOrder':
        return createResponse(requireRole(token, ['customer'], handleCreateOrder, payload));
      case 'listMyOrders':
        return createResponse(requireRole(token, ['customer'], handleListMyOrders, payload));
      case 'cancelOrder':
        return createResponse(requireRole(token, ['customer'], handleCancelOrder, payload));
      case 'listOrders':
        return createResponse(requireRole(token, ['admin'], handleListOrders, payload));
      case 'listContacts':
        return createResponse(requireRole(token, ['admin'], handleListContacts, payload));
      case 'deleteAccount':
        return createResponse(requireRole(token, ['customer', 'admin'], handleDeleteAccount, payload));
      case 'submitContact':
        return createResponse(handleSubmitContact(payload));
      default:
        return createResponse({ ok: false, error: 'Unsupported action.' });
    }
  } catch (err) {
    Logger.log(err);
    return createResponse({ ok: false, error: err.message || err.toString() });
  }
}

function parsePayload(method, e) {
  if (method === 'GET') {
    const params = e.parameter || {};
    Object.keys(params).forEach(function (key) {
      params[key] = sanitize(params[key]);
    });
    return params;
  }
  if (!e.postData || !e.postData.contents) {
    return {};
  }
  const type = e.postData.type || '';
  if (type.indexOf('application/json') !== -1) {
    const json = JSON.parse(e.postData.contents);
    return sanitizeObject(json);
  }
  return sanitizeObject(e.parameter || {});
}

function sanitize(value) {
  if (typeof value === 'string') {
    return value.replace(/[<>]/g, '');
  }
  return value;
}

function sanitizeObject(obj) {
  const clean = {};
  Object.keys(obj || {}).forEach(function (key) {
    clean[key] = sanitize(obj[key]);
  });
  return clean;
}

function formatDateTime(date) {
  return Utilities.formatDate(date || new Date(), SCRIPT_TIMEZONE, 'dd-MM-yyyy HH:mm:ss');
}

function parseDateTime(value) {
  if (!value) return null;
  const trimmed = value.toString().trim();
  const parts = trimmed.split(/[-\s:]/);
  if (parts.length >= 3 && parts[0].length <= 2 && parts[1].length <= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
    const minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
    const second = parts.length > 5 ? parseInt(parts[5], 10) : 0;
    if ([day, month, year, hour, minute, second].some(function (num) {
      return isNaN(num);
    })) {
      return null;
    }
    const parsed = new Date(year, month, day, hour, minute, second);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function getRateLimitKey(prefix, identifier) {
  const sanitizedIdentifier = (identifier || 'anonymous').toString().toLowerCase();
  return ['tt_rate', prefix, sanitizedIdentifier].join(':');
}

function getRateLimitState(key) {
  const cache = CacheService.getDocumentCache();
  if (!cache) return null;
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.windowStart && parsed.attempts) {
      return parsed;
    }
  } catch (err) {
    return null;
  }
  return null;
}

function enforceRateLimit(prefix, identifier) {
  const config = RATE_LIMIT_CONFIG[prefix];
  if (!config) return;
  const key = getRateLimitKey(prefix, identifier);
  const cache = CacheService.getDocumentCache();
  if (!cache) return;
  const state = getRateLimitState(key);
  if (!state) return;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  if (now - state.windowStart > windowMs) {
    cache.remove(key);
    return;
  }
  if (state.attempts >= config.limit) {
    throw new Error(RATE_LIMIT_MESSAGES[prefix] || 'Too many attempts. Please try again later.');
  }
}

function recordRateLimitFailure(prefix, identifier) {
  const config = RATE_LIMIT_CONFIG[prefix];
  if (!config) return;
  const cache = CacheService.getDocumentCache();
  if (!cache) return;
  const key = getRateLimitKey(prefix, identifier);
  const windowMs = config.windowSeconds * 1000;
  const now = Date.now();
  const state = getRateLimitState(key);
  let attempts = 1;
  let windowStart = now;
  if (state && now - state.windowStart <= windowMs) {
    attempts = state.attempts + 1;
    windowStart = state.windowStart;
  }
  cache.put(key, JSON.stringify({ attempts: attempts, windowStart: windowStart }), config.windowSeconds);
}

function clearRateLimit(prefix, identifier) {
  const cache = CacheService.getDocumentCache();
  if (!cache) return;
  cache.remove(getRateLimitKey(prefix, identifier));
}

function createResponse(data) {
  const json = JSON.stringify(data);
  const output = ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  const response = output;
  response.setHeader('Access-Control-Allow-Origin', ORIGIN);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function readRows(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  const headers = values[0];
  return values.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (header, idx) {
      obj[header] = row[idx];
    });
    return obj;
  });
}

function findUserByEmail(email) {
  if (!email) return null;
  const sheet = getSheet('Users');
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return null;
  const headers = rows[0];
  const emailIdx = headers.indexOf('Email');
  if (emailIdx === -1) return null;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][emailIdx] || '').toString().toLowerCase() === email.toLowerCase()) {
      const obj = {};
      headers.forEach(function (header, idx) {
        obj[header] = rows[i][idx];
      });
      obj._row = i + 1;
      return obj;
    }
  }
  return null;
}

function upsertUser(user) {
  const sheet = getSheet('Users');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let rowIndex = user._row || 0;
  const rowValues = headers.map(function (header) {
    return user[header] || '';
  });
  if (rowIndex) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    rowIndex = sheet.getLastRow();
  }
  return rowIndex;
}

function hashPassword(password) {
  const signature = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    PASSWORD_SALT + password,
    Utilities.Charset.UTF_8
  );
  return signature.map(function (byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function hashPasswordWithSalt(password, salt) {
  const signature = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    (salt || '') + password,
    Utilities.Charset.UTF_8
  );
  return signature.map(function (byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function issueToken(email) {
  const token = Utilities.getUuid();
  const expiry = formatDateTime(new Date(Date.now() + TOKEN_TTL_MS));
  const user = findUserByEmail(email);
  if (!user) throw new Error('User not found');
  user.Token = token;
  user.TokenExpiry = expiry;
  user.UpdatedAt = formatDateTime(new Date());
  upsertUser(user);
  return { token: token, expiry: expiry };
}

function requireRole(token, roles, handler, payload) {
  const user = validateToken(token);
  if (!user || roles.indexOf(user.Role) === -1) {
    throw new Error('Unauthorized');
  }
  payload._currentUser = user;
  return handler(payload);
}

function validateToken(token) {
  if (!token) return null;
  const user = findUserByToken(token);
  if (!user) return null;
  const expiry = parseDateTime(user.TokenExpiry);
  if (!expiry || expiry.getTime() < Date.now()) {
    return null;
  }
  return user;
}

function findUserByToken(token) {
  if (!token) return null;
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const tokenIdx = headers.indexOf('Token');
  if (tokenIdx === -1) return null;
  for (let i = 1; i < values.length; i++) {
    if ((values[i][tokenIdx] || '').toString() === token) {
      const obj = {};
      headers.forEach(function (header, idx) {
        obj[header] = values[i][idx];
      });
      obj._row = i + 1;
      return obj;
    }
  }
  return null;
}

function handleSignup(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const password = payload.password || '';
  const name = payload.name || '';
  const identifier = email || (payload.deviceId || '') || 'anonymous';
  enforceRateLimit('signup', identifier);
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    if (findUserByEmail(email)) {
      throw new Error('Account already exists');
    }
    if (!/@gmail\.com$/.test(email)) {
      throw new Error('A Gmail address is required for signup.');
    }
    const hash = hashPassword(password);
    const verificationCode = Utilities.getUuid();
    const sheet = getSheet('Users');
    sheet.appendRow([
      email,
      name,
      PASSWORD_SALT,
      hash,
      'customer',
      '',
      '',
      false,
      verificationCode,
      '',
      '',
      formatDateTime(new Date()),
      formatDateTime(new Date())
    ]);
    MailApp.sendEmail({
      to: email,
      subject: 'Verify your Tinkling Tales account',
      htmlBody: 'Your verification code is: <b>' + verificationCode + '</b>'
    });
    clearRateLimit('signup', identifier);
    return { ok: true, message: 'Signup successful. Check your email for verification.' };
  } catch (error) {
    recordRateLimitFailure('signup', identifier);
    throw error;
  }
}

function handleLogin(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const password = payload.password || '';
  const identifier = email || (payload.deviceId || '') || 'anonymous';
  enforceRateLimit('login', identifier);
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const user = findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    let computed = hashPassword(password);
    if (computed !== user.PasswordHash) {
      const legacy = hashPasswordWithSalt(password, user.Salt);
      if (legacy !== user.PasswordHash) {
        throw new Error('Invalid credentials');
      }
      user.PasswordHash = computed;
      user.Salt = PASSWORD_SALT;
      user.UpdatedAt = formatDateTime(new Date());
      upsertUser(user);
    }
    if (!user.Verified) {
      throw new Error('Please verify your email before logging in.');
    }
    const tokenInfo = issueToken(email);
    clearRateLimit('login', identifier);
    return {
      ok: true,
      token: tokenInfo.token,
      expiry: tokenInfo.expiry,
      role: user.Role,
      name: user.Name,
      email: user.Email
    };
  } catch (error) {
    recordRateLimitFailure('login', identifier);
    throw error;
  }
}

function handleAdminSignup(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const password = payload.password || '';
  const name = payload.name || '';
  const adminCode = payload.adminCode || '';
  const identifier = email || (payload.deviceId || '') || 'anonymous';
  enforceRateLimit('adminSignup', identifier);
  try {
    if (!email || !password || !adminCode) {
      throw new Error('Email, password, and admin code are required');
    }
    if (!/@gmail\.com$/.test(email)) {
      throw new Error('Admin signup requires a Gmail address.');
    }
    const settings = getSettings();
    if (!settings.adminCode || settings.adminCode !== adminCode) {
      throw new Error('Invalid admin code');
    }
    if (findUserByEmail(email)) {
      throw new Error('Account already exists');
    }
    const hash = hashPassword(password);
    const verificationCode = Utilities.getUuid();
    const sheet = getSheet('Users');
    sheet.appendRow([
      email,
      name,
      PASSWORD_SALT,
      hash,
      'admin',
      '',
      '',
      false,
      verificationCode,
      '',
      '',
      formatDateTime(new Date()),
      formatDateTime(new Date())
    ]);
    MailApp.sendEmail({
      to: email,
      subject: 'Verify your Tinkling Tales admin account',
      htmlBody: 'Your admin verification code is: <b>' + verificationCode + '</b>'
    });
    clearRateLimit('adminSignup', identifier);
    return { ok: true, message: 'Admin signup successful. Check your email for verification.' };
  } catch (error) {
    recordRateLimitFailure('adminSignup', identifier);
    throw error;
  }
}

function handleAdminLogin(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const identifier = email || (payload.deviceId || '') || 'anonymous';
  enforceRateLimit('adminLogin', identifier);
  try {
    const response = handleLogin(payload);
    if (response.role !== 'admin') {
      throw new Error('Admin privileges required');
    }
    clearRateLimit('adminLogin', identifier);
    return response;
  } catch (error) {
    recordRateLimitFailure('adminLogin', identifier);
    throw error;
  }
}

function handleForgotPassword(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const user = findUserByEmail(email);
  if (!user) {
    return { ok: true }; // Avoid leaking user existence.
  }
  const resetCode = Utilities.getUuid();
  user.ResetCode = resetCode;
  user.ResetExpiry = formatDateTime(new Date(Date.now() + 1000 * 60 * 30));
  upsertUser(user);
  MailApp.sendEmail({
    to: email,
    subject: 'Reset your Tinkling Tales password',
    htmlBody: 'Use this code to reset your password: <b>' + resetCode + '</b>'
  });
  return { ok: true, message: 'If the email exists, a reset code has been sent.' };
}

function handleResetPassword(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const resetCode = payload.resetCode || '';
  const newPassword = payload.newPassword || '';
  const user = findUserByEmail(email);
  if (!user || !user.ResetCode || user.ResetCode !== resetCode) {
    throw new Error('Invalid reset code');
  }
  const expiry = parseDateTime(user.ResetExpiry);
  if (!expiry || expiry.getTime() < Date.now()) {
    throw new Error('Reset code expired');
  }
  const hash = hashPassword(newPassword);
  user.Salt = PASSWORD_SALT;
  user.PasswordHash = hash;
  user.ResetCode = '';
  user.ResetExpiry = '';
  user.UpdatedAt = formatDateTime(new Date());
  upsertUser(user);
  return { ok: true, message: 'Password reset successful.' };
}

function handleVerifyEmail(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const code = payload.code || '';
  const user = findUserByEmail(email);
  if (!user || user.VerificationCode !== code) {
    throw new Error('Invalid verification code');
  }
  user.Verified = true;
  user.VerificationCode = '';
  user.UpdatedAt = formatDateTime(new Date());
  upsertUser(user);
  return { ok: true, message: 'Email verified successfully.' };
}

function handleListProducts(payload) {
  const sheet = getSheet('Products');
  const products = readRows(sheet);
  const query = (payload.query || '').toLowerCase();
  const category = (payload.category || '').toLowerCase();
  const statusFilter = (payload.status || 'active').toLowerCase();
  let filtered = products;
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter(function (product) {
      return (product.Status || '').toString().toLowerCase() === statusFilter;
    });
  }
  if (query) {
    filtered = filtered.filter(function (product) {
      return (
        (product.Title || '').toString().toLowerCase().indexOf(query) !== -1 ||
        (product.Description || '').toString().toLowerCase().indexOf(query) !== -1 ||
        (product.Tags || '').toString().toLowerCase().indexOf(query) !== -1
      );
    });
  }
  if (category) {
    filtered = filtered.filter(function (product) {
      return (product.Category || '').toString().toLowerCase() === category;
    });
  }
  return { ok: true, products: filtered };
}

function handleGetProduct(payload) {
  const id = payload.id || '';
  if (!id) throw new Error('Product ID required');
  const sheet = getSheet('Products');
  const products = readRows(sheet);
  const product = products.find(function (p) {
    return (p.ID || '').toString() === id.toString();
  });
  if (!product) {
    throw new Error('Product not found');
  }
  return { ok: true, product: product };
}

function handleAddProduct(payload) {
  const sheet = getSheet('Products');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const id = Utilities.getUuid();
  const now = formatDateTime(new Date());
  const data = {
    ID: id,
    Title: payload.title || '',
    Description: payload.description || '',
    Price: Number(payload.price || 0),
    Category: payload.category || '',
    Tags: (payload.tags || []).join(', '),
    ImageUrl: payload.imageUrl || '',
    Inventory: Number(payload.inventory || 0),
    Status: payload.status || 'active',
    CreatedAt: now,
    UpdatedAt: now
  };
  const row = headers.map(function (header) {
    return data[header] || '';
  });
  sheet.appendRow(row);
  return { ok: true, product: data };
}

function handleUpdateProduct(payload) {
  const id = payload.id || '';
  if (!id) throw new Error('Product ID required');
  const sheet = getSheet('Products');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('No products found');
  const headers = values[0];
  const idIdx = headers.indexOf('ID');
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if ((values[i][idIdx] || '').toString() === id.toString()) {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex === -1) throw new Error('Product not found');
  const row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const map = {};
  headers.forEach(function (header, idx) {
    map[header] = row[idx];
  });
  map.Title = payload.title || map.Title;
  map.Description = payload.description || map.Description;
  map.Price = payload.price !== undefined ? Number(payload.price) : map.Price;
  map.Category = payload.category || map.Category;
  map.Tags = payload.tags ? payload.tags.join(', ') : map.Tags;
  map.ImageUrl = payload.imageUrl || map.ImageUrl;
  map.Inventory = payload.inventory !== undefined ? Number(payload.inventory) : map.Inventory;
  map.Status = payload.status || map.Status;
  map.UpdatedAt = formatDateTime(new Date());
  const updatedRow = headers.map(function (header) {
    return map[header] || '';
  });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);
  return { ok: true, product: map };
}

function handleDeleteProduct(payload) {
  const id = payload.id || '';
  if (!id) throw new Error('Product ID required');
  const sheet = getSheet('Products');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('No products found');
  const headers = values[0];
  const idIdx = headers.indexOf('ID');
  for (let i = 1; i < values.length; i++) {
    if ((values[i][idIdx] || '').toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  throw new Error('Product not found');
}

function handleCreateOrder(payload) {
  const user = payload._currentUser;
  const items = payload.items || [];
  const total = Number(payload.total || 0);
  if (!items.length) {
    throw new Error('Order items required');
  }
  const sheet = getSheet('Orders');
  const now = formatDateTime(new Date());
  sheet.appendRow([
    Utilities.getUuid(),
    user.Email,
    JSON.stringify(items),
    total,
    'pending',
    'unpaid',
    now,
    now
  ]);
  return { ok: true, message: 'Order created. Status is pending until confirmed.' };
}

function findOrderById(orderId) {
  if (!orderId) return null;
  const sheet = getSheet('Orders');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idIdx = headers.indexOf('ID');
  if (idIdx === -1) return null;
  for (let i = 1; i < values.length; i++) {
    if ((values[i][idIdx] || '').toString() === orderId.toString()) {
      const obj = {};
      headers.forEach(function (header, idx) {
        obj[header] = values[i][idx];
      });
      return { order: obj, rowIndex: i + 1, headers: headers, sheet: sheet };
    }
  }
  return null;
}

function handleListMyOrders(payload) {
  const user = payload._currentUser;
  const sheet = getSheet('Orders');
  const orders = readRows(sheet).filter(function (order) {
    return (order.UserEmail || '').toString().toLowerCase() === user.Email.toLowerCase();
  });
  return { ok: true, orders: orders };
}

function handleCancelOrder(payload) {
  const user = payload._currentUser;
  const orderId = payload.orderId || '';
  if (!orderId) {
    throw new Error('Order ID required');
  }
  const match = findOrderById(orderId);
  if (!match || !match.order) {
    throw new Error('Order not found');
  }
  if ((match.order.UserEmail || '').toString().toLowerCase() !== user.Email.toLowerCase()) {
    throw new Error('Order not found');
  }
  const status = (match.order.Status || '').toString().toLowerCase();
  if (status !== 'pending') {
    throw new Error('Order can no longer be cancelled.');
  }
  match.order.Status = 'cancelled';
  match.order.UpdatedAt = formatDateTime(new Date());
  const updatedRow = match.headers.map(function (header) {
    return match.order[header] || '';
  });
  match.sheet.getRange(match.rowIndex, 1, 1, match.headers.length).setValues([updatedRow]);
  return { ok: true, order: match.order };
}

function removeRowsByEmail(sheetName, columnName, email) {
  if (!email) return;
  const sheet = getSheet(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const headers = data[0];
  const columnIndex = headers.indexOf(columnName);
  if (columnIndex === -1) return;
  for (let i = data.length - 1; i >= 1; i--) {
    if ((data[i][columnIndex] || '').toString().toLowerCase() === email.toLowerCase()) {
      sheet.deleteRow(i + 1);
    }
  }
}

function handleDeleteAccount(payload) {
  const user = payload._currentUser;
  const password = payload.password || '';
  if (!password) {
    throw new Error('Password confirmation is required.');
  }
  const userRecord = findUserByEmail(user.Email);
  if (!userRecord) {
    throw new Error('Account not found');
  }
  let computed = hashPassword(password);
  if (computed !== userRecord.PasswordHash) {
    const legacy = hashPasswordWithSalt(password, userRecord.Salt);
    if (legacy !== userRecord.PasswordHash) {
      throw new Error('Invalid password.');
    }
    userRecord.PasswordHash = computed;
    userRecord.Salt = PASSWORD_SALT;
    userRecord.UpdatedAt = formatDateTime(new Date());
    upsertUser(userRecord);
  }
  const usersSheet = getSheet('Users');
  usersSheet.deleteRow(userRecord._row);
  removeRowsByEmail('Orders', 'UserEmail', userRecord.Email);
  removeRowsByEmail('Contacts', 'Email', userRecord.Email);
  return { ok: true, message: 'Account deleted successfully.' };
}

function handleListOrders() {
  const sheet = getSheet('Orders');
  return { ok: true, orders: readRows(sheet) };
}

function handleSubmitContact(payload) {
  const name = payload.name || '';
  const email = payload.email || '';
  const subject = payload.subject || '';
  const message = payload.message || '';
  const sheet = getSheet('Contacts');
  sheet.appendRow([
    Utilities.getUuid(),
    name,
    email,
    subject,
    message,
    'new',
    formatDateTime(new Date())
  ]);
  return { ok: true, message: 'Message received. We will respond soon.' };
}

function handleListContacts() {
  const sheet = getSheet('Contacts');
  return { ok: true, contacts: readRows(sheet) };
}

function getSettings() {
  const sheet = getSheet('Settings');
  const rows = readRows(sheet);
  const settings = {};
  rows.forEach(function (row) {
    settings[row.Key] = row.Value;
  });
  return settings;
}
