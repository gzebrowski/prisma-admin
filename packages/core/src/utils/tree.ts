/**
 * TreeManager - A TypeScript class for managing tree structures using Materialized Path
 * Similar to Django's MP_Node from django-treebeard package
 * 
 * This class works with Prisma ORM and PostgreSQL to manage hierarchical data
 * using the Materialized Path approach where each node stores its path from root.
 */

type TreeModel = {
  id: number | string;
  path: string | null;
  depth: number | null;
  [key: string]: any;
};

type PrismaDelegate = {
  create: (args: any) => Promise<any>;
  createMany: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  updateMany: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args: any) => Promise<any>;
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  findFirst: (args?: any) => Promise<any>;
  count: (args?: any) => Promise<number>;
};

type Position = 'first-child' | 'last-child' | 'first-sibling' | 'left' | 'right' | 'last-sibling';

export class TreeManager<T extends TreeModel> {
  protected readonly steplen = 4;
  protected readonly queryset: PrismaDelegate;

  constructor(queryset: PrismaDelegate) {
    this.queryset = queryset;
  }

  /**
   * Adds a new root node to the tree
   * @param data - The data for the new root node
   * @returns Promise<T> - The created root node
   */
  async addRoot(data: Omit<T, 'id' | 'path' | 'depth'>): Promise<T> {
    // Find the last root node to determine the new path
    const lastRoot = await this.queryset.findFirst({
      where: {
        depth: 1
      },
      orderBy: {
        path: 'desc'
      }
    });

    let newPath: string;
    if (!lastRoot || !lastRoot.path) {
      // First root node
      newPath = this.intToBase36(1).padStart(this.steplen, '0');
    } else {
      // Get the next path for a new root
      const lastRootNum = this.base36ToInt(lastRoot.path.substring(0, this.steplen));
      newPath = this.intToBase36(lastRootNum + 1).padStart(this.steplen, '0');
    }

    return await this.queryset.create({
      data: {
        ...data,
        path: newPath,
        depth: 1
      }
    });
  }

  /**
   * Adds a child node to the specified parent
   * @param relativeObj - The parent node
   * @param newRecordData - Data for the new child node
   * @returns Promise<T> - The created child node
   */
  async addChild(relativeObj: T, newRecordData: Omit<T, 'id' | 'path' | 'depth'>): Promise<T> {
    if (!relativeObj.path || relativeObj.depth === null) {
      throw new Error('Parent node must have valid path and depth');
    }

    const newPath = await this.calculateChildPath(relativeObj, false);

    return await this.queryset.create({
      data: {
        ...newRecordData,
        path: newPath,
        depth: relativeObj.depth + 1
      }
    });
  }

  /**
   * Adds a sibling node relative to the specified node
   * @param relativeObj - The reference node
   * @param newRecordData - Data for the new sibling node
   * @param position - Position relative to the reference node
   * @returns Promise<T> - The created sibling node
   */
  async addSibling(
    relativeObj: T, 
    newRecordData: Omit<T, 'id' | 'path' | 'depth'>, 
    position: 'first-sibling' | 'left' | 'right' | 'last-sibling'
  ): Promise<T> {
    if (!relativeObj.path || relativeObj.depth === null) {
      throw new Error('Reference node must have valid path and depth');
    }

    const parentPath = this.getParentPath(relativeObj.path);
    const depth = relativeObj.depth;

    switch (position) {
      case 'first-sibling':
        return await this.insertSiblingAt(parentPath, depth, newRecordData, 'first');
      case 'left':
        return await this.insertSiblingBefore(relativeObj, newRecordData);
      case 'right':
        return await this.insertSiblingAfter(relativeObj, newRecordData);
      case 'last-sibling':
        return await this.insertSiblingAt(parentPath, depth, newRecordData, 'last');
      default:
        throw new Error(`Invalid position: ${position}`);
    }
  }

  /**
   * Moves a node to a new position in the tree
   * @param nodeToMove - The node to move
   * @param targetObj - The target node for positioning
   * @param position - Position relative to target
   * @returns Promise<T> - The moved node
   */
  async move(nodeToMove: T, targetObj: T, position: Position): Promise<T> {
    if (!nodeToMove.path || !targetObj.path) {
      throw new Error('Both nodes must have valid paths');
    }

    // Check if trying to move node into its own subtree
    if (targetObj.path.startsWith(nodeToMove.path)) {
      throw new Error('Cannot move node into its own subtree');
    }

    // Get all descendants that need to be updated
    const descendants = await this.getDescendants(nodeToMove);
    
    let newPath: string;
    let newDepth: number;

    switch (position) {
      case 'first-child':
        newPath = await this.calculateChildPath(targetObj, true);
        newDepth = targetObj.depth! + 1;
        break;
      case 'last-child':
        newPath = await this.calculateChildPath(targetObj, false);
        newDepth = targetObj.depth! + 1;
        break;
      case 'left':
        const leftResult = await this.calculateSiblingPath(targetObj, 'left');
        newPath = leftResult.path;
        newDepth = leftResult.depth;
        break;
      case 'right':
        const rightResult = await this.calculateSiblingPath(targetObj, 'right');
        newPath = rightResult.path;
        newDepth = rightResult.depth;
        break;
      default:
        throw new Error(`Invalid position: ${position}`);
    }

    // Update the node and all its descendants
    const pathDifference = newPath.length - nodeToMove.path.length;
    const depthDifference = newDepth - nodeToMove.depth!;

    // Update the moved node
    const updatedNode = await this.queryset.update({
      where: { id: nodeToMove.id },
      data: {
        path: newPath,
        depth: newDepth
      }
    });

    // Update all descendants
    for (const descendant of descendants) {
      if (!descendant.path || descendant.depth === null) {
        continue;
      }

      const newDescendantPath = newPath + descendant.path.substring(nodeToMove.path.length);
      const newDescendantDepth = descendant.depth + depthDifference;

      await this.queryset.update({
        where: { id: descendant.id },
        data: {
          path: newDescendantPath,
          depth: newDescendantDepth
        }
      });
    }

    return updatedNode;
  }

  /**
   * Deletes a node and all its descendants
   * @param nodeToDelete - The node to delete
   * @returns Promise<number> - Number of deleted records
   */
  async delete(nodeToDelete: T): Promise<number> {
    if (!nodeToDelete.path) {
      throw new Error('Node must have a valid path');
    }

    // Delete the node and all its descendants
    const result = await this.queryset.deleteMany({
      where: {
        path: {
          startsWith: nodeToDelete.path
        }
      }
    });

    return result.count;
  }

  /**
   * Gets all descendants of a node
   * @param node - The parent node
   * @returns Promise<T[]> - Array of descendant nodes
   */
  async getDescendants(node: T, withMe = false): Promise<T[]> {
    if (!node.path) {
      throw new Error('Node must have a valid path');
    }
    const excludeCondition = withMe ? {} : { not: node.path };
    return await this.queryset.findMany({
      where: {
        path: {
          startsWith: node.path,
          ...excludeCondition
        }
      },
      orderBy: {
        path: 'asc'
      }
    });
  }

  /**
   * Gets all children of a node (direct descendants only)
   * @param node - The parent node
   * @returns Promise<T[]> - Array of child nodes
   */
  async getChildren(node: T): Promise<T[]> {
    if (!node.path || node.depth === null) {
      throw new Error('Node must have a valid path and depth');
    }

    return await this.queryset.findMany({
      where: {
        path: {
          startsWith: node.path,
          not: node.path
        },
        depth: node.depth + 1
      },
      orderBy: {
        path: 'asc'
      }
    });
  }

  /**
   * Gets all ancestors of a node
   * @param node - The target node
   * @returns Promise<T[]> - Array of ancestor nodes
   */
  async getAncestors(node: T, withMe = false): Promise<T[]> {
    if (!node.path) {
      throw new Error('Node must have a valid path');
    }

    const ancestorPaths: string[] = [];
    const length = (withMe) ? node.path.length : node.path.length - this.steplen;
    for (let i = this.steplen; i <= length; i += this.steplen) {
      ancestorPaths.push(node.path.substring(0, i));
    }

    if (ancestorPaths.length === 0) {
      return [];
    }

    return await this.queryset.findMany({
      where: {
        path: {
          in: ancestorPaths
        }
      },
      orderBy: {
        path: 'asc'
      }
    });
  }

  /**
   * Gets the root nodes of the tree
   * @returns Promise<T[]> - Array of root nodes
   */
  async getRoots(): Promise<T[]> {
    return await this.queryset.findMany({
      where: {
        depth: 1
      },
      orderBy: {
        path: 'asc'
      }
    });
  }

  /**
   * Utility method to convert number to base36 with proper padding
   * @param num - Number to convert
   * @returns string - Base36 encoded string with steplen padding
   */
  public generatePathSegment(num: number): string {
    return this.intToBase36(num).padStart(this.steplen, '0');
  }

  /**
   * Gets the steplen value used for path segments
   * @returns number - The steplen value
   */
  public getSteplen(): number {
    return this.steplen;
  }

  /**
   * Rebuilds the tree structure from parent-child relationships
   * Useful for migrating existing hierarchical data to materialized path format
   * @param relationships - Array of objects with id and parentId properties
   * @returns Promise<void>
   */
  async rebuildTreeFromRelationships(relationships: Array<{id: string, parentId: string | null, [key: string]: any}>): Promise<void> {
    // Create a map of parentId -> children
    const childrenMap = new Map<string, any[]>();
    const rootItems: any[] = [];

    for (const item of relationships) {
      if (item.parentId === null) {
        rootItems.push(item);
      } else {
        if (!childrenMap.has(item.parentId)) {
          childrenMap.set(item.parentId, []);
        }
        childrenMap.get(item.parentId)!.push(item);
      }
    }

    // Process root items
    let rootCounter = 1;
    for (const rootItem of rootItems) {
      const rootPath = this.generatePathSegment(rootCounter);
      await this.queryset.update({
        where: { id: rootItem.id },
        data: {
          path: rootPath,
          depth: 1
        }
      });

      await this.rebuildTreeRecursive(rootItem.id, rootPath, 1, childrenMap);
      rootCounter++;
    }
  }

  /**
   * Recursive helper for rebuilding tree structure
   */
  private async rebuildTreeRecursive(parentId: string, parentPath: string, parentDepth: number, childrenMap: Map<string, any[]>): Promise<void> {
    const children = childrenMap.get(parentId) || [];
    
    let childCounter = 1;
    for (const child of children) {
      const childPathSegment = this.generatePathSegment(childCounter);
      const childPath = parentPath + childPathSegment;
      const childDepth = parentDepth + 1;
      
      await this.queryset.update({
        where: { id: child.id },
        data: {
          path: childPath,
          depth: childDepth
        }
      });

      await this.rebuildTreeRecursive(child.id, childPath, childDepth, childrenMap);
      childCounter++;
    }
  }

  // Protected helper methods for use by subclasses

  protected intToBase36(num: number): string {
    return num.toString(36).toUpperCase();
  }

  protected base36ToInt(str: string): number {
    return parseInt(str, 36);
  }

  // Private helper methods

  private getParentPath(path: string): string | null {
    if (path.length <= this.steplen) {
      return null; // Root node has no parent
    }
    return path.substring(0, path.length - this.steplen);
  }

  private async insertSiblingAt(
    parentPath: string | null, 
    depth: number, 
    newRecordData: Omit<T, 'id' | 'path' | 'depth'>, 
    position: 'first' | 'last'
  ): Promise<T> {
    // Simplified implementation - in production, you might want gap management
    const siblings = await this.queryset.findMany({
      where: parentPath ? {
        path: { startsWith: parentPath, not: parentPath },
        depth: depth
      } : { depth: depth },
      orderBy: { path: position === 'first' ? 'asc' : 'desc' }
    });

    let newPath: string;
    if (siblings.length === 0) {
      // First sibling
      const pathSegment = this.generatePathSegment(1);
      newPath = parentPath ? parentPath + pathSegment : pathSegment;
    } else {
      // Calculate new path based on position
      if (position === 'first') {
        // Insert before first sibling - would need gap management in production
        const firstSibling = siblings[0];
        const pathPart = firstSibling.path.substring(parentPath?.length || 0, (parentPath?.length || 0) + this.steplen);
        const firstNum = this.base36ToInt(pathPart);
        newPath = (parentPath || '') + this.generatePathSegment(Math.max(1, firstNum - 1));
      } else {
        // Insert after last sibling
        const lastSibling = siblings[0]; // desc order, so first is last
        const pathPart = lastSibling.path.substring(parentPath?.length || 0, (parentPath?.length || 0) + this.steplen);
        const lastNum = this.base36ToInt(pathPart);
        newPath = (parentPath || '') + this.generatePathSegment(lastNum + 1);
      }
    }

    return await this.queryset.create({
      data: {
        ...newRecordData,
        path: newPath,
        depth: depth
      }
    });
  }

  private async insertSiblingBefore(relativeObj: T, newRecordData: Omit<T, 'id' | 'path' | 'depth'>): Promise<T> {
    // Simplified implementation
    const parentPath = this.getParentPath(relativeObj.path!);
    const pathPart = relativeObj.path!.substring(parentPath?.length || 0, (parentPath?.length || 0) + this.steplen);
    const relativeNum = this.base36ToInt(pathPart);
    const newPath = (parentPath || '') + this.generatePathSegment(Math.max(1, relativeNum - 1));

    return await this.queryset.create({
      data: {
        ...newRecordData,
        path: newPath,
        depth: relativeObj.depth!
      }
    });
  }

  private async insertSiblingAfter(relativeObj: T, newRecordData: Omit<T, 'id' | 'path' | 'depth'>): Promise<T> {
    // Simplified implementation
    const parentPath = this.getParentPath(relativeObj.path!);
    const pathPart = relativeObj.path!.substring(parentPath?.length || 0, (parentPath?.length || 0) + this.steplen);
    const relativeNum = this.base36ToInt(pathPart);
    const newPath = (parentPath || '') + this.generatePathSegment(relativeNum + 1);

    return await this.queryset.create({
      data: {
        ...newRecordData,
        path: newPath,
        depth: relativeObj.depth!
      }
    });
  }

  private async calculateChildPath(parent: T, isFirst: boolean): Promise<string> {
    const children = await this.getChildren(parent);
    
    if (children.length === 0) {
      return parent.path! + this.intToBase36(1).padStart(this.steplen, '0');
    }

    if (isFirst) {
      // Would need to shift existing children - simplified implementation
      return parent.path! + this.intToBase36(1).padStart(this.steplen, '0');
    } else {
      const lastChild = children[children.length - 1];
      const childPathPart = lastChild.path!.substring(parent.path!.length, parent.path!.length + this.steplen);
      const lastChildNum = this.base36ToInt(childPathPart);
      return parent.path! + this.intToBase36(lastChildNum + 1).padStart(this.steplen, '0');
    }
  }

  private async calculateSiblingPath(target: T, position: string): Promise<{path: string, depth: number}> {
    const parentPath = this.getParentPath(target.path!);
    const pathPart = target.path!.substring(parentPath?.length || 0, (parentPath?.length || 0) + this.steplen);
    const targetNum = this.base36ToInt(pathPart);
    
    let newNum: number;
    if (position === 'left') {
      newNum = Math.max(1, targetNum - 1);
    } else {
      newNum = targetNum + 1;
    }
    
    const newPath = (parentPath || '') + this.generatePathSegment(newNum);
    return { path: newPath, depth: target.depth! };
  }

  private async shiftSiblingsRight(parentPath: string | null, depth: number): Promise<void> {
    // This is a simplified implementation
    // In a production system, you might want to implement a more sophisticated gap management system
    const siblings = await this.queryset.findMany({
      where: parentPath ? {
        path: { startsWith: parentPath, not: parentPath },
        depth: depth
      } : { depth: depth },
      orderBy: { path: 'desc' }
    });

    // Update paths in reverse order to avoid conflicts
    for (const sibling of siblings) {
      const pathPart = sibling.path.substring(parentPath?.length || 0, (parentPath?.length || 0) + this.steplen);
      const siblingNum = this.base36ToInt(pathPart);
      const newPathPart = this.intToBase36(siblingNum + 1).padStart(this.steplen, '0');
      const newPath = (parentPath || '') + newPathPart + sibling.path.substring((parentPath?.length || 0) + this.steplen);

      await this.queryset.update({
        where: { id: sibling.id },
        data: { path: newPath }
      });
    }
  }
}

export type { TreeModel, PrismaDelegate, Position };