const { PaymentTerm } = require('../models/PaymentTerm');

const paymentTermController = {
    async getAllPaymentTerms(req, res) {
        try {
            const terms = await PaymentTerm.findAll();
            res.status(200).json({
                success: true,
                data: terms.map(t => t.toJSON()),
                count: terms.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getPaymentTermById(req, res) {
        try {
            const term = await PaymentTerm.findById(parseInt(req.params.id));
            if (!term) {
                return res.status(404).json({ success: false, error: 'Payment term not found' });
            }
            res.status(200).json({ success: true, data: term.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = paymentTermController;