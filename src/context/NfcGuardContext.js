/**
 * context/NfcGuardContext.js
 * Expone pause()/resume() del guard NFC a toda la app.
 * Las pantallas de sellar/validar llaman pause() antes de operar
 * con el tag y resume() al terminar.
 */
import React, { createContext, useContext } from 'react';
import { useNfcGuard } from '../hooks/useNfcGuard';

const NfcGuardContext = createContext({
  pause:  async () => {},
  resume: async () => {},
});

export const NfcGuardProvider = ({ children }) => {
  const { pause, resume } = useNfcGuard();
  return (
    <NfcGuardContext.Provider value={{ pause, resume }}>
      {children}
    </NfcGuardContext.Provider>
  );
};

export const useNfcGuardControl = () => useContext(NfcGuardContext);
