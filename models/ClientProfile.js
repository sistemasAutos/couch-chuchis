const mongoose = require('mongoose');

const clientProfileSchema = new mongoose.Schema({
  client_id: { type: String, required: true, unique: true }, // Referencia a Client
  objetivo: { 
    type: String, 
    enum: ['perdida_grasa', 'hipertrofia', 'recomposicion', 'rendimiento', 'fuerza'],
    default: 'hipertrofia' 
  },
  experiencia: { 
    type: String, 
    enum: ['principiante', 'intermedio', 'avanzado'],
    default: 'principiante'
  },
  dias_disponibles: { type: Number, default: 4, min: 1, max: 7 },
  equipamiento: { type: String, enum: ['gym', 'casa_minimal', 'bandas', 'sin_equipo'], default: 'gym' },
  limitaciones: { type: [String], default: [] },
  region_cultural: { type: String, default: 'mexico' },
  restricciones_alimentarias: { type: [String], default: [] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('ClientProfile', clientProfileSchema);
