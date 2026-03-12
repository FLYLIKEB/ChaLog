import { useState, useEffect, useRef } from 'react';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { logger } from '../lib/logger';

export function useTeaSelector(preselectedTeaId?: number | null) {
  const [teas, setTeas] = useState<Tea[]>([]);
  const teasRef = useRef<Tea[]>([]);
  const [selectedTea, setSelectedTea] = useState<number | null>(
    preselectedTeaId ?? null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching] = useState(false);

  useEffect(() => {
    const fetchTeas = async () => {
      try {
        const data = await teasApi.getAll();
        const teasArray = Array.isArray(data) ? data : [];
        setTeas(teasArray);
        teasRef.current = teasArray;
      } catch (error) {
        logger.error('Failed to fetch teas:', error);
      }
    };
    fetchTeas();
  }, []);

  useEffect(() => {
    if (!preselectedTeaId) return;

    const tea = teasRef.current.find((t) => t.id === preselectedTeaId);
    if (tea) {
      setSelectedTea(preselectedTeaId);
      setSearchQuery(tea.name);
    } else {
      const fetchTea = async () => {
        try {
          const teaData = await teasApi.getById(preselectedTeaId);
          if (teaData) {
            setTeas((prev) => {
              if (prev.some((t) => t.id === preselectedTeaId)) return prev;
              const updated = [...prev, teaData as Tea];
              teasRef.current = updated;
              return updated;
            });
            setSelectedTea(preselectedTeaId);
            setSearchQuery((teaData as Tea).name);
          }
        } catch (error) {
          logger.error('Failed to fetch tea:', error);
        }
      };
      fetchTea();
    }
  }, [preselectedTeaId]);

  const filteredTeas = teas.filter((tea) => {
    const query = searchQuery.toLowerCase();
    return (
      tea.name.toLowerCase().includes(query) ||
      tea.type.toLowerCase().includes(query) ||
      (tea.seller && tea.seller.toLowerCase().includes(query))
    );
  });

  const results = selectedTea ? [] : filteredTeas;

  const selectTea = (teaId: number, teaName: string) => {
    setSelectedTea(teaId);
    setSearchQuery(teaName);
  };

  const clearSelection = () => {
    setSelectedTea(null);
  };

  const selectedTeaData = selectedTea
    ? teas.find((t) => t.id === selectedTea) ?? null
    : null;

  return {
    query: searchQuery,
    setQuery: (q: string) => {
      setSearchQuery(q);
      setSelectedTea(null);
    },
    results,
    selectedTea,
    selectedTeaData,
    selectTea,
    clearSelection,
    isSearching,
    teas,
    teasRef,
    setTeas,
  };
}
