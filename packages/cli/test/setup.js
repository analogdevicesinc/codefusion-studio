process.env.XDG_CONFIG_HOME = './test/config';
process.env.CFSUTIL_CONFIG_HOME = './test/config';
process.env.CFS_INSTALL_DIR = './test/fixtures';
process.env.CFS_TEST_NODE_PATH = process.execPath;
process.env.CFS_TEST_ENV_VALUE = 'env-from-test-setup';
