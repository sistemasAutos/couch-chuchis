const Routine = require('../models/Routine');
const ClientProfile = require('../models/ClientProfile');
const RoutineAssignment = require('../models/RoutineAssignment');
const { getClientState } = require('../services/clientStateService');
const { generateWorkoutPlan } = require('../agents/workoutAgent');
const { generateCompletion } = require('../agents/deepseekClient');

exports.createRoutineNewClient = async (req, res) => {
  try {
    const { profile_info, client_id } = req.body; // Puede o no traer client_id si aun se esta creando
    const plan = await generateWorkoutPlan({ ...profile_info, fatiga_percibida: 5, adherencia: 1.0 });

    const routine = new Routine({
      tipo: 'cliente_nuevo',
      trainer_id: req.user.id,
      client_id: client_id || null,
      tenant_id: req.user.gym_id,
      perfil_snapshot: profile_info,
      plan: plan,
      estado: 'propuesta'
    });
    
    await routine.save();
    res.json({ routine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createRoutineExisting = async (req, res) => {
  try {
    const { id } = req.params; // client_id
    const state = await getClientState(id);
    if (!state) return res.status(404).json({ error: 'Estado del cliente no encontrado' });

    const mergedState = {
       ...state.profile_info,
       ...state.current_state,
    };

    const plan = await generateWorkoutPlan(mergedState);

    const routine = new Routine({
      tipo: 'ia_pura',
      trainer_id: req.user.id,
      client_id: id,
      tenant_id: req.user.gym_id,
      perfil_snapshot: mergedState,
      plan: plan,
      estado: 'propuesta'
    });
    
    await routine.save();
    res.json({ routine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createRoutineAnonymous = async (req, res) => {
  try {
    const { dias_disponibles, equipamiento, objetivo, experiencia } = req.body;
    const plan = await generateWorkoutPlan({ dias_disponibles, equipamiento, objetivo, experiencia, fatiga_percibida: 5, adherencia: 1.0 });

    const routine = new Routine({
      tipo: 'sin_cliente',
      trainer_id: req.user.id,
      tenant_id: req.user.gym_id,
      perfil_snapshot: req.body,
      plan: plan,
      estado: 'propuesta'
    });
    
    await routine.save();
    res.json({ routine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createRoutineCoachDraft = async (req, res) => {
  try {
    const { draftText, client_id } = req.body;
    
    let perfil = {};
    if (client_id) {
       const state = await getClientState(client_id);
       perfil = state ? { ...state.profile_info, ...state.current_state } : {};
    }

    // Agent evaluates the draft
    const sysPrompt = `Eres un asistente de evaluación biomecánica y diseño de rutinas. El coach te proporciona un borrador de rutina. Evalúalo brevemente en función de volumen, frecuencia e intensidad. Responde en texto.`;
    const prompt = `Perfil del cliente: ${JSON.stringify(perfil)}\n\nBorrador propuesto por el Coach:\n${draftText}`;

    const evaluation = await generateCompletion(prompt, sysPrompt);

    const routine = new Routine({
      tipo: 'propuesta_coach',
      trainer_id: req.user.id,
      client_id: client_id || null,
      tenant_id: req.user.gym_id,
      perfil_snapshot: perfil,
      estado: 'en_debate',
      debate_log: [
        { autor: 'coach', mensaje: draftText },
        { autor: 'agente', mensaje: evaluation }
      ]
    });
    
    await routine.save();
    res.json({ routine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.debateRoutine = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje } = req.body;

    const routine = await Routine.findById(id);
    if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

    routine.debate_log.push({ autor: 'coach', mensaje });
    routine.estado = 'en_debate';

    const history = routine.debate_log.map(m => `${m.autor.toUpperCase()}: ${m.mensaje}`).join('\n');
    const sysPrompt = `Eres un agente experto debatiendo con un coach sobre una rutina. Lee el historial y da tu opinión o actualización recomendada sobre la rutina propuesta.`;
    
    const reply = await generateCompletion(`Historial:\n${history}\n\nResponde al último mensaje del COACH:`, sysPrompt);

    routine.debate_log.push({ autor: 'agente', mensaje: reply });
    await routine.save();

    res.json({ routine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveRoutine = async (req, res) => {
  try {
    const { id } = req.params;
    const { notas, active_week } = req.body;

    const routine = await Routine.findById(id);
    if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

    if (routine.client_id) {
      // Marcar activas previas como reemplazadas
      await Routine.updateMany(
        { client_id: routine.client_id, estado: 'activa' }, 
        { $set: { estado: 'reemplazada' } }
      );
      
      const count = await Routine.countDocuments({ client_id: routine.client_id });
      routine.version = count + 1;
      
      // Asignar en tabla pivote
      if (active_week) {
        const asig = new RoutineAssignment({
           client_id: routine.client_id,
           routine_id: routine._id,
           week_assigned: active_week
        });
        await asig.save();
      }
    }

    routine.estado = 'activa';
    if (notas) routine.notas_aprobacion = notas;
    if (active_week) routine.semana_activacion = active_week;

    await routine.save();
    res.json({ routine, message: 'Rutina activada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
