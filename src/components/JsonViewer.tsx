'use client';

import React from 'react';

interface JsonViewerProps {
  data: any;
  title?: string;
}

// Fonction pour sanitizer les chaînes JSON avant de les parser
const sanitizeJsonString = (jsonString: string): string => {
  if (typeof jsonString !== 'string') return jsonString;
  
  console.log('JsonViewer - sanitizeJsonString - traitement d\'une chaîne de longueur:', jsonString.length);
  
  // Détecter si c'est potentiellement une chaîne JSON-like
  const trimmed = jsonString.trim();
  const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                        (trimmed.startsWith('[') && trimmed.endsWith(']'));
  
  console.log('JsonViewer - sanitizeJsonString - ressemble à du JSON:', looksLikeJson);
  
  if (looksLikeJson) {
    // Détecter les balises d'image dans le JSON
    const hasImgTags = jsonString.includes('<img');
    console.log('JsonViewer - sanitizeJsonString - contient des balises img:', hasImgTags);
    
    if (hasImgTags) {
      console.log('JsonViewer - sanitizeJsonString - remplacement des balises img');
      try {
        // Approche 1: Remplacer directement les balises dans la chaîne JSON
        let sanitized = jsonString.replace(
          /<img[^>]+(?:src|data-outlook-trace)[^>]*>/gi,
          '[Image: Voir dans l\'email original du ticket]'
        );
        
        // Vérifier si c'est un JSON valide après sanitization
        JSON.parse(sanitized); // Test only, will throw if invalid
        console.log('JsonViewer - sanitizeJsonString - remplacement direct réussi');
        return sanitized;
      } catch (e) {
        console.log('JsonViewer - sanitizeJsonString - remplacement direct a échoué, essai avec double escape');
        
        // Approche 2: Doubler les backslashes pour gérer l'escape double
        try {
          let doubleEscaped = jsonString.replace(/\\/g, '\\\\'); // Double les backslashes
          doubleEscaped = doubleEscaped.replace(
            /<img[^>]+(?:src|data-outlook-trace)[^>]*>/gi,
            '[Image: Voir dans l\'email original du ticket]'
          );
          
          // Vérifier si JSON valide
          JSON.parse(doubleEscaped);
          console.log('JsonViewer - sanitizeJsonString - double escape réussi');
          return doubleEscaped;
        } catch (e2) {
          console.log('JsonViewer - sanitizeJsonString - toutes les tentatives de sanitization ont échoué');
        }
      }
    }
  }
  
  // Méthode de secours: remplacer les balises si contenues dans la chaîne
  if (jsonString.includes('<img')) {
    return jsonString.replace(
      /<img[^>]*>/gi,
      '[Image: Voir dans l\'email original du ticket]'
    );
  }
  
  return jsonString;
};

/**
 * Composant pour afficher des données JSON de manière lisible
 */
export default function JsonViewer({ data, title }: JsonViewerProps) {
  console.log('JsonViewer - render - type de données reçues:', typeof data);
  
  // TRAITEMENT SPECIAL pour les objets connus comme form_data et extra_details
  // qui peuvent contenir des balises d'image imbriquées
  if (typeof data === 'object' && data !== null) {
    const isSpecialObject = Object.keys(data).some(key => 
      key === 'form_data' || key === 'extra_details' || key === 'notes'
    );
    
    if (isSpecialObject) {
      console.log('JsonViewer - détection d\'un objet spécial (form_data/extra_details/notes)');
      
      // Créer une copie sanitizée de l'objet
      const sanitizedObj: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && (value.includes('<img') || value.includes('\"<img'))) {
          console.log(`JsonViewer - sanitization de la chaîne ${key} contenant des balises img`);
          sanitizedObj[key] = '[Image détectée: voir dans l\'email original]';
        } else if (typeof value === 'object' && value !== null) {
          // Traiter spécifiquement les objets qui pourraient contenir des balises d'image
          try {
            // Si c'est un objet qui pourrait contenir des balises d'image en tant que chaînes
            let stringified = JSON.stringify(value);
            if (stringified.includes('<img')) {
              console.log(`JsonViewer - sanitization de l'objet ${key} contenant des balises img`);
              stringified = stringified.replace(
                /<img[^>]*>/gi, 
                '[Image: Voir dans l\'email original du ticket]'
              );
              sanitizedObj[key] = JSON.parse(stringified);
            } else {
              sanitizedObj[key] = value;
            }
          } catch (err) {
            // Si erreur, conserver la valeur originale
            console.log(`JsonViewer - erreur lors de la sanitization de ${key}:`, err);
            sanitizedObj[key] = value;
          }
        } else {
          // Conserver les autres valeurs telles quelles
          sanitizedObj[key] = value;
        }
      }
      
      console.log('JsonViewer - objet sanitizé');
      data = sanitizedObj;
    }
  }
  
  // Si les données sont une chaîne, essayer de les parser en JSON
  let jsonData = data;
  if (typeof data === 'string') {
    console.log('JsonViewer - traitement d\'une chaîne de longueur:', data.length);
    
    // Sanitize avant même de tenter le parsing
    // Pour les balises d'image imbriquées dans des chaînes JSON 
    if (data.includes('<img')) {
      console.log('JsonViewer - balise img détectée dans la chaîne brute, sanitization');
      data = data.replace(/<img[^>]*>/gi, '[Image: Voir dans l\'email original du ticket]');
    }
    
    try {
      // Sanitize la chaîne JSON avant de la parser
      const sanitizedData = sanitizeJsonString(data);
      jsonData = JSON.parse(sanitizedData);
      console.log('JsonViewer - parsing JSON réussi après sanitization');
    } catch (e) {
      // Si le parsing échoue même après sanitization
      console.error('JsonViewer - échec du parsing JSON après sanitization:', e);
      
      // Dernier recours: afficher directement la chaîne sanitizée
      if (data.includes('<img')) {
        const simplifiedData = data.replace(
          /<img[^>]*>/gi,
          '[Image: Voir dans l\'email original du ticket]'
        );
        return (
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="font-medium text-blue-600 mb-2">Contenu avec références à des images:</p>
            <pre className="text-sm whitespace-pre-wrap">{simplifiedData}</pre>
          </div>
        );
      }
      
      // Afficher un message d'erreur plus convivial avec les premiers caractères
      const maxPreviewLength = 100;
      const preview = data.length > maxPreviewLength ? 
        data.substring(0, maxPreviewLength) + '...' : data;
      return (
        <div className="text-red-500 p-3 border border-red-200 bg-red-50 rounded-md">
          <p className="font-medium mb-2">Erreur de format JSON</p>
          <p>Aperçu du contenu: <span className="font-mono text-sm">{preview}</span></p>
        </div>
      );
    }
  }

  // Si ce n'est pas un objet ou un tableau, afficher la valeur brute
  if (typeof jsonData !== 'object' || jsonData === null) {
    return <div className="p-2">{String(jsonData)}</div>;
  }

  // Fonction pour détecter et traiter des balises HTML dans les chaînes de caractères
  const processStringValue = (value: string): React.ReactNode => {
    if (typeof value !== 'string') return value;
    
    // Détecter les balises d'image
    if (value.match(/<img[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/i)) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>[Image: Voir dans l'email original du ticket]</span>
        </div>
      );
    }
    
    return value;
  };
  
  // Fonction récursive pour rendre différents types de données
  const renderValue = (value: any, level: number = 0): React.ReactNode => {
    // Indentation pour les niveaux imbriqués
    const indent = level * 16;
    
    if (Array.isArray(value)) {
      return (
        <div className={`rounded-md ${level === 0 ? 'bg-blue-50 p-3' : 'ml-2'}`}>
          {value.length === 0 ? (
            <span className="text-gray-500 italic">Tableau vide</span>
          ) : (
            value.map((item, idx) => (
              <div key={idx} className="my-1">
                <span className="text-gray-500 mr-2">{idx + 1}.</span>
                {renderValue(item, level + 1)}
              </div>
            ))
          )}
        </div>
      );
    }
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div className={`${level === 0 ? 'bg-blue-50 rounded-md p-3' : 'ml-2'}`}>
          {Object.keys(value).length === 0 ? (
            <span className="text-gray-500 italic">Objet vide</span>
          ) : (
            Object.entries(value).map(([key, val]) => (
              <div key={key} className="my-2">
                <div className="flex items-start">
                  <span 
                    className="font-medium text-blue-800 min-w-[100px] mr-2" 
                    style={{ paddingLeft: `${indent}px` }}
                  >
                    {key}
                  </span>
                  <div className="flex-1">
                    {renderValue(val, level + 1)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }
    
    // Valeurs simples (string, number, boolean)
    if (typeof value === 'string') {
      // Traitement spécial pour les chaînes qui pourraient contenir des balises HTML
      return (
        <span className="text-green-700">
          {processStringValue(value)}
        </span>
      );
    }
    
    // Autres types de valeurs simples
    return (
      <span className={`${typeof value === 'number' ? 'text-blue-700' : 'text-red-700'}`}>
        {String(value)}
      </span>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {renderValue(jsonData)}
    </div>
  );
}
