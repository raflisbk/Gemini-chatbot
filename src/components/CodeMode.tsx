import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, X, Zap, FileCode, Palette, Database, Globe, Smartphone } from 'lucide-react';
import { Button } from './ui/button';

interface CodeModeProps {
  isActive: boolean;
  onToggle: () => void;
  onTemplateSelect: (template: string) => void;
}

const codeTemplates = [
  {
    id: 'web-app',
    name: 'Web Application',
    icon: Globe,
    description: 'Create a modern web application',
    template: 'Create a modern web application with the following features:'
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    icon: Smartphone,
    description: 'Build a mobile application',
    template: 'Create a mobile application with React Native that includes:'
  },
  {
    id: 'api',
    name: 'REST API',
    icon: Database,
    description: 'Build a REST API backend',
    template: 'Create a REST API using Node.js/Express with the following endpoints:'
  },
  {
    id: 'ui-component',
    name: 'UI Component',
    icon: Palette,
    description: 'Design a reusable UI component',
    template: 'Create a reusable UI component in React/TypeScript with these specifications:'
  },
  {
    id: 'algorithm',
    name: 'Algorithm',
    icon: Zap,
    description: 'Implement an algorithm or function',
    template: 'Implement an algorithm/function that:'
  },
  {
    id: 'custom',
    name: 'Custom Code',
    icon: FileCode,
    description: 'Write custom code from scratch',
    template: 'Write code that:'
  }
];

export function CodeMode({ isActive, onToggle, onTemplateSelect }: CodeModeProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleTemplateClick = (template: typeof codeTemplates[0]) => {
    setSelectedTemplate(template.id);
    onTemplateSelect(template.template);
    // Auto-close after selection
    setTimeout(() => {
      setSelectedTemplate(null);
    }, 300);
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        type="button"
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={onToggle}
        className={`gap-2 ${isActive ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : ''}`}
        title="Toggle code mode"
      >
        <Code className="h-4 w-4" />
        Code Mode
      </Button>

      {/* Code Mode Panel */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-2 right-0 w-80 bg-card border rounded-lg shadow-lg p-4 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Code Mode Active</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-4">
              Choose a template or describe what you want to build. The AI will provide detailed code solutions.
            </p>

            {/* Templates Grid */}
            <div className="grid grid-cols-2 gap-2">
              {codeTemplates.map((template) => (
                <motion.button
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTemplateClick(template)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    selectedTemplate === template.id
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                      : 'bg-muted/30 hover:bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <template.icon className="h-3 w-3 text-blue-600" />
                    <span className="font-medium text-xs">{template.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </motion.button>
              ))}
            </div>

            {/* Tips */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Pro Tips</span>
              </div>
              <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <li>• Be specific about technologies (React, Python, etc.)</li>
                <li>• Describe expected inputs and outputs</li>
                <li>• Mention any constraints or requirements</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}