import React, { useMemo, useState } from 'react';
import {
  createTemplate,
  deleteTemplate,
  getAllTemplates,
  TEMPLATE_CATEGORIES,
  updateTemplate,
  type ProposalTemplate,
  type TemplateCategory,
} from '../utils/templates';

interface TemplateFormState {
  name: string;
  category: TemplateCategory;
  description: string;
  recipient: string;
  amount: string;
  token: string;
  memo: string;
}

const INITIAL_FORM: TemplateFormState = {
  name: '',
  category: 'Custom',
  description: '',
  recipient: '',
  amount: '',
  token: '',
  memo: '',
};

const toFormState = (template: ProposalTemplate): TemplateFormState => ({
  name: template.name,
  category: template.category,
  description: template.description,
  recipient: template.recipient,
  amount: template.amount,
  token: template.token,
  memo: template.memo,
});

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<ProposalTemplate[]>(() => getAllTemplates());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => (editingId ? 'Update Template' : 'Create Template'), [editingId]);

  const refreshTemplates = () => {
    setTemplates(getAllTemplates());
  };

  const handleInputChange =
    (field: keyof TemplateFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleCreateNew = () => {
    setEditingId(null);
    setFormState(INITIAL_FORM);
    setError(null);
  };

  const handleEdit = (template: ProposalTemplate) => {
    if (template.isDefault) {
      return;
    }
    setEditingId(template.id);
    setFormState(toFormState(template));
    setError(null);
  };

  const handleDelete = (template: ProposalTemplate) => {
    if (template.isDefault) {
      return;
    }
    if (!window.confirm(`Delete template "${template.name}"?`)) {
      return;
    }
    try {
      deleteTemplate(template.id);
      refreshTemplates();
      if (editingId === template.id) {
        handleCreateNew();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      setError(message);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) {
        updateTemplate(editingId, { ...formState });
      } else {
        createTemplate(
          formState.name,
          formState.category,
          formState.description,
          formState.recipient,
          formState.amount,
          formState.token,
          formState.memo
        );
      }
      refreshTemplates();
      handleCreateNew();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template';
      setError(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-semibold">Template Manager</h3>
        <button
          type="button"
          onClick={handleCreateNew}
          className="min-h-[44px] rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
        >
          Create New Template
        </button>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={formState.name}
              onChange={handleInputChange('name')}
              placeholder="Template name"
              className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
            <select
              value={formState.category}
              onChange={handleInputChange('category')}
              className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            >
              {TEMPLATE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              value={formState.recipient}
              onChange={handleInputChange('recipient')}
              placeholder="Recipient (supports {{variable}})"
              className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
            <input
              value={formState.amount}
              onChange={handleInputChange('amount')}
              placeholder="Amount (supports {{variable}})"
              className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
            <input
              value={formState.token}
              onChange={handleInputChange('token')}
              placeholder="Token address"
              className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
            <input
              value={formState.memo}
              onChange={handleInputChange('memo')}
              placeholder="Memo (supports {{variable}})"
              className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
          <textarea
            value={formState.description}
            onChange={handleInputChange('description')}
            placeholder="Template description"
            className="h-20 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            className="min-h-[44px] rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            {submitLabel}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-xl border border-gray-700 bg-gray-800 p-4 sm:flex sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-white">{template.name}</p>
              <p className="text-sm text-gray-400">
                {template.category} · {template.description}
              </p>
              <p className="text-xs text-gray-500">Used {template.usageCount} times</p>
            </div>
            <div className="mt-3 flex gap-2 sm:mt-0">
              <button
                type="button"
                onClick={() => handleEdit(template)}
                disabled={template.isDefault}
                className="min-h-[40px] rounded-lg bg-gray-700 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(template)}
                disabled={template.isDefault}
                className="min-h-[40px] rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateManager;
