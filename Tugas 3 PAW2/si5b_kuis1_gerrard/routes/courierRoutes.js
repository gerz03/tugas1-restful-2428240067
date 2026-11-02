const express = require('express');
const courierController = require('../controllers/courierController');
const cekApiKey = require('../middlewares/cekApiKey');
const validateObjectId = require('../middlewares/validateObjectId');

const router = express.Router();

router.get('/', courierController.getAllCouriers);
router.get('/:id', validateObjectId, courierController.getCourierById);

router.post('/', cekApiKey, courierController.createCourier);
router.put('/:id', cekApiKey, validateObjectId, courierController.updateCourier);
router.delete('/:id', cekApiKey, validateObjectId, courierController.deleteCourier);

module.exports = router;
