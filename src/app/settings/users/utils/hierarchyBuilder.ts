import { Agent, getRoleSortOrder } from './roleHelpers';

export type HierarchyNode = {
  agent: Agent;
  children: HierarchyNode[];
  level: number;
};

export const buildHierarchy = (agentsList: Agent[]): HierarchyNode[] => {
  const agentMap = new Map<number, Agent>();
  const children = new Map<number, Agent[]>();
  const roots: Agent[] = [];

  // Create maps for quick lookup
  agentsList.forEach((agent) => {
    agentMap.set(agent.id, agent);
    children.set(agent.id, []);
  });

  // Build parent-child relationships
  agentsList.forEach((agent) => {
    if (agent.managerId && agentMap.has(agent.managerId)) {
      children.get(agent.managerId)!.push(agent);
    } else {
      // No manager = root level (typically Admin)
      roots.push(agent);
    }
  });

  const buildNode = (agent: Agent, level: number = 0): HierarchyNode => {
    const childAgents = children.get(agent.id) || [];
    const childNodes = childAgents
      .sort((a, b) => {
        // Sort by role hierarchy first, then by name
        const aOrder = getRoleSortOrder(a.role);
        const bOrder = getRoleSortOrder(b.role);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      })
      .map((child) => buildNode(child, level + 1));

    return { agent, children: childNodes, level };
  };

  // Sort roots by role (Admin first, then others)
  return roots
    .sort((a, b) => {
      const aOrder = getRoleSortOrder(a.role);
      const bOrder = getRoleSortOrder(b.role);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    })
    .map((root) => buildNode(root));
};
