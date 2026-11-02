const express = require('express');
const shipmentController = require('../controllers/shipmentController');
const cekApiKey = require('../middlewares/cekApiKey');
const validateObjectId = require('../middlewares/validateObjectId');

const router = express.Router();

router.get('/', shipmentController.getAllShipments);
router.get('/:id', validateObjectId, shipmentController.getShipmentById);

router.post('/', cekApiKey, shipmentController.createShipment);
router.post('/:id/tracking', cekApiKey, validateObjectId, shipmentController.addTracking);
router.put('/:id', cekApiKey, validateObjectId, shipmentController.updateShipment);
router.delete('/:id', cekApiKey, validateObjectId, shipmentController.deleteShipment);

module.exports = router;
