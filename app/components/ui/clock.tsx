"use client";

import { useState, useEffect } from "react";

export function Clock() {
  const [dateTime, setDateTime] = useState({
    date: "",
    time: ""
  });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Formatar data: DD/MM/YYYY
      const date = now.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      
      // Formatar hora: HH:MM:SS
      const time = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      
      setDateTime({ date, time });
    };

    // Atualizar imediatamente e depois a cada segundo
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);

    // Limpar intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <div className="text-sm font-semibold text-gray-900">{dateTime.date}</div>
      <div className="text-xs text-gray-500">{dateTime.time}</div>
    </div>
  );
}