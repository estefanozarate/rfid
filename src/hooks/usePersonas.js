/**
 * hooks/usePersonas.js
 * ──────────────────────────────────────────────────────────
 * Hook que expone todas las operaciones de la DB a las pantallas.
 * Maneja estado de carga y errores automáticamente.
 */

import { useState, useCallback } from 'react';
import {
  getAllPersonas,
  getPersonaByAddress,
  getPersonaById,
  searchPersonas,
  insertPersona,
  updatePersona,
  deletePersona,
  countPersonas,
} from '../db/personasRepository';

export const usePersonas = () => {
  const [personas,  setPersonas]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  // ── Cargar todas ─────────────────────────────────────────
  const loadAll = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const data = getAllPersonas();
      setPersonas(data);
      return data;
    } catch (err) {
      console.warn('[usePersonas] loadAll error:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Buscar por texto ─────────────────────────────────────
  const search = useCallback((query) => {
    try {
      setLoading(true);
      setError(null);
      if (!query?.trim()) {
        const data = getAllPersonas();
        setPersonas(data);
        return data;
      }
      const data = searchPersonas(query);
      setPersonas(data);
      return data;
    } catch (err) {
      console.warn('[usePersonas] search error:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Buscar por address (retorna una persona o null) ──────
  const findByAddress = useCallback((address) => {
    try {
      setError(null);
      return getPersonaByAddress(address);
    } catch (err) {
      console.warn('[usePersonas] findByAddress error:', err);
      setError(err.message);
      return null;
    }
  }, []);

  // ── Buscar por id ────────────────────────────────────────
  const findById = useCallback((id) => {
    try {
      setError(null);
      return getPersonaById(id);
    } catch (err) {
      console.warn('[usePersonas] findById error:', err);
      setError(err.message);
      return null;
    }
  }, []);

  // ── Insertar ─────────────────────────────────────────────
  const insert = useCallback((nombre, apellido, address) => {
    try {
      setError(null);
      const id = insertPersona(nombre, apellido, address);
      // Recargar lista
      const data = getAllPersonas();
      setPersonas(data);
      return { success: true, id };
    } catch (err) {
      console.warn('[usePersonas] insert error:', err);
      const msg = err.message?.includes('UNIQUE')
        ? 'Ya existe una persona con ese address.'
        : err.message;
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ── Actualizar ───────────────────────────────────────────
  const update = useCallback((id, data) => {
    try {
      setError(null);
      updatePersona(id, data);
      const updated = getAllPersonas();
      setPersonas(updated);
      return { success: true };
    } catch (err) {
      console.warn('[usePersonas] update error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // ── Eliminar ─────────────────────────────────────────────
  const remove = useCallback((id) => {
    try {
      setError(null);
      deletePersona(id);
      const data = getAllPersonas();
      setPersonas(data);
      return { success: true };
    } catch (err) {
      console.warn('[usePersonas] remove error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // ── Contar ───────────────────────────────────────────────
  const count = useCallback(() => {
    try {
      return countPersonas();
    } catch (err) {
      console.warn('[usePersonas] count error:', err);
      return 0;
    }
  }, []);

  return {
    personas,
    loading,
    error,
    loadAll,
    search,
    findByAddress,
    findById,
    insert,
    update,
    remove,
    count,
  };
};