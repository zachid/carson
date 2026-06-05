import { create } from 'zustand';
import api from '../api/client.js';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/projects');
      set({ projects: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createProject: async (name, url) => {
    const { data } = await api.post('/projects', { name, url });
    set(s => ({ projects: [data, ...s.projects] }));
    return data;
  },

  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`);
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
    if (get().currentProject?.id === id) set({ currentProject: null });
  },

  loadProject: async (id) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/projects/${id}`);
      set({ currentProject: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  refreshCurrentProject: async () => {
    const id = get().currentProject?.id;
    if (!id) return;
    const { data } = await api.get(`/projects/${id}`);
    set({ currentProject: data });
    return data;
  },

  updateProject: async (id, fields) => {
    const { data } = await api.patch(`/projects/${id}`, fields);
    set(s => ({
      projects: s.projects.map(p => p.id === id ? data : p),
      currentProject: s.currentProject?.id === id ? { ...s.currentProject, ...data } : s.currentProject,
    }));
    return data;
  },

  saveDirection: async (id, direction) => {
    await api.post(`/projects/${id}/direction`, direction);
    await get().refreshCurrentProject();
  },

  triggerExport: async (id) => {
    await api.post(`/projects/${id}/export`);
  },
}));

export default useProjectStore;
