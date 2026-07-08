process.env.NODE_ENV = 'test';

// Mock mongoose models with proper chaining support
const createMockModel = () => {
  return {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn()
    }),
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn()
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn()
    }),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn().mockReturnValue({
      match: jest.fn().mockReturnThis(),
      group: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn()
    })
  };
};

jest.mock('../src/models/User', () => createMockModel());
jest.mock('../src/models/Product', () => createMockModel());
jest.mock('../src/models/Order', () => createMockModel());
jest.mock('../src/models/Adoption', () => createMockModel());

// Mock database connection to prevent actual connection during tests
jest.mock('../src/config/db', () => jest.fn());

// Mock email service
jest.mock('../src/utils/sendEmail');

// Set a test JWT secret
process.env.JWT_SECRET = 'testjwtsecret';
// Set cookie expiration for tests
process.env.JWT_COOKIE_EXPIRE = '7';