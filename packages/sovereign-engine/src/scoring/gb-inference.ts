/**
 * OMEGA GB V1 Inference Engine — Phase P0
 * Date: 2026-03-22
 * Role: Pure TypeScript inference for Gradient Boosting V1 model
 *
 * Loads the 50-tree model exported from Python (GB_V1_MODEL.json)
 * and performs prediction via tree traversal. No sklearn dependency.
 *
 * Deterministic: same features -> same score.
 */

import modelData from './data/GB_V1_MODEL.json' with { type: 'json' };

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface TreeNode {
  feature_index: number;
  threshold: number;
  left_child: number;
  right_child: number;
  value: number;
  is_leaf: boolean;
}

interface Tree {
  tree_index: number;
  n_nodes: number;
  nodes: TreeNode[];
}

interface GBModel {
  init_value: number;
  feature_names: string[];
  trees: Tree[];
  params: {
    learning_rate: number;
    n_estimators: number;
    max_depth: number;
  };
  feature_importance: Record<string, number>;
  sanity_check: Array<{
    filename: string;
    tier: string;
    sklearn_score: number;
    features: Record<string, number>;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════
// TREE TRAVERSAL
// ═══════════════════════════════════════════════════════════════════════

function predictTree(tree: Tree, features: number[]): number {
  let node = 0;
  while (!tree.nodes[node].is_leaf) {
    const n = tree.nodes[node];
    if (features[n.feature_index] <= n.threshold) {
      node = n.left_child;
    } else {
      node = n.right_child;
    }
  }
  return tree.nodes[node].value;
}

function predictGB(model: GBModel, features: number[]): number {
  let prediction = model.init_value;
  for (const tree of model.trees) {
    prediction += model.params.learning_rate * predictTree(tree, features);
  }
  return prediction;
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

const model = modelData as unknown as GBModel;

/**
 * Score a text using the GB V1 model from a feature record.
 *
 * @param features - Record of feature name to numeric value (42 features)
 * @returns GB V1 prediction on tier scale (1-5)
 */
export function scoreGB(features: Record<string, number>): number {
  const featureArray = model.feature_names.map(name => features[name] ?? 0);
  return predictGB(model, featureArray);
}

/**
 * Get the ordered list of feature names expected by the model.
 */
export function getFeatureNames(): string[] {
  return [...model.feature_names];
}

/**
 * Get feature importance from the trained model.
 */
export function getFeatureImportance(): Array<{ name: string; importance: number }> {
  return Object.entries(model.feature_importance)
    .map(([name, importance]) => ({ name, importance }))
    .sort((a, b) => b.importance - a.importance);
}

/**
 * Get the sanity check data for parity testing.
 */
export function getSanityCheck(): GBModel['sanity_check'] {
  return model.sanity_check;
}

/**
 * Get the model init value (baseline prediction before trees).
 */
export function getInitValue(): number {
  return model.init_value;
}

/**
 * Get the learning rate.
 */
export function getLearningRate(): number {
  return model.params.learning_rate;
}

export { predictGB, predictTree };
export type { GBModel, Tree, TreeNode };
