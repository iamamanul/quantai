import React, { useState } from "react";

export default function ResumePreview({ formValues, user, editMode = false, onSave, onCancel }) {
  const [editState, setEditState] = useState(formValues);
  const isEditing = editMode;

  // Extract fields from formValues
  const contact = (isEditing ? editState.contactInfo : formValues.contactInfo) || {};
  const summary = (isEditing ? editState.summary : formValues.summary) || "";
  const skills = (isEditing ? editState.skills : formValues.skills) || "";
  const experience = (isEditing ? editState.experience : formValues.experience) || [];
  const projects = (isEditing ? editState.projects : formValues.projects) || [];
  const education = (isEditing ? editState.education : formValues.education) || [];
  const portfolio = (isEditing ? editState.portfolio : formValues.portfolio) || "";

  // Helper to render skills in categories if user uses categories
  function renderSkills(skills) {
    // Try to parse as JSON or split by lines
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) {
        return (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {parsed.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        );
      }
    } catch {}
    // Fallback: split by lines or semicolons
    return (
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {skills.split(/\n|;/).map((s, i) => s.trim() && <li key={i}>{s.trim()}</li>)}
      </ul>
    );
  }

  // Handlers for inline editing
  function handleFieldChange(field, value) {
    setEditState((prev) => ({ ...prev, [field]: value }));
  }
  function handleContactChange(field, value) {
    setEditState((prev) => ({ ...prev, contactInfo: { ...prev.contactInfo, [field]: value } }));
  }
  function handleArrayChange(field, idx, subfield, value) {
    setEditState((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === idx ? { ...item, [subfield]: value } : item)
    }));
  }

  return (
    <div style={{ fontFamily: 'Georgia, Times, serif', color: '#222', background: '#fff', padding: 32, maxWidth: 800, margin: '0 auto', fontSize: 15, lineHeight: 1.5 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #222', paddingBottom: 8 }}>
        <div>
          {isEditing ? (
            <input
              style={{ fontSize: 32, fontWeight: 700, margin: 0, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }}
              value={editState.fullName || user?.fullName || user?.firstName || "Your Name"}
              onChange={e => setEditState((prev) => ({ ...prev, fullName: e.target.value }))}
            />
          ) : (
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{user?.fullName || user?.firstName || "Your Name"}</h1>
          )}
          <div style={{ fontSize: 17, fontWeight: 500, marginTop: 2 }}>{isEditing ? (
            <input
              style={{ fontSize: 17, fontWeight: 500, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }}
              value={editState.title || "Information Technology"}
              onChange={e => setEditState((prev) => ({ ...prev, title: e.target.value }))}
            />
          ) : (
            formValues.title || "Information Technology"
          )}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          {isEditing ? (
            <>
              <input style={{ fontSize: 13, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={contact.email || ''} onChange={e => handleContactChange('email', e.target.value)} placeholder="Email" />
              <input style={{ fontSize: 13, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={contact.mobile || ''} onChange={e => handleContactChange('mobile', e.target.value)} placeholder="Mobile" />
              <input style={{ fontSize: 13, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={contact.linkedin || ''} onChange={e => handleContactChange('linkedin', e.target.value)} placeholder="LinkedIn" />
            </>
          ) : (
            <>
              <div>{contact.email}</div>
              <div>{contact.mobile}</div>
              {contact.linkedin && <div><a href={contact.linkedin} style={{ color: '#1a0dab', textDecoration: 'underline' }}>{contact.linkedin}</a></div>}
            </>
          )}
        </div>
      </div>

      {/* Summary & Portfolio */}
      <div style={{ marginTop: 18, marginBottom: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
          My Portfolio{isEditing ? (
            <>
              : <input style={{ fontSize: 13, border: 'none', outline: 'none', background: '#f8f8f8', width: 300 }} value={portfolio} onChange={e => handleFieldChange('portfolio', e.target.value)} placeholder="Portfolio Link" />
            </>
          ) : portfolio ? (
            <>: <a href={portfolio} style={{ color: '#1a0dab', textDecoration: 'underline', fontSize: 13 }} target="_blank" rel="noopener noreferrer">{portfolio}</a></>
          ) : ":-"}
        </div>
        <div style={{ fontSize: 15 }}>
          {isEditing ? (
            <textarea style={{ fontSize: 15, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={summary} onChange={e => handleFieldChange('summary', e.target.value)} />
          ) : summary}
        </div>
      </div>

      {/* Skills */}
      <div style={{ borderTop: '1px solid #bbb', borderBottom: '1px solid #bbb', padding: '10px 0', margin: '18px 0' }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Skills</div>
        {isEditing ? (
          <textarea style={{ fontSize: 13, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={skills} onChange={e => handleFieldChange('skills', e.target.value)} />
        ) : renderSkills(skills)}
      </div>

      {/* Experience */}
      {experience.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 17, borderBottom: '1px solid #bbb', marginBottom: 8 }}>Experience</div>
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              {isEditing ? (
                <>
                  <input style={{ fontWeight: 700, fontSize: 15, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={exp.organization} onChange={e => handleArrayChange('experience', i, 'organization', e.target.value)} placeholder="Organization" />
                  <input style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 13, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={exp.startDate} onChange={e => handleArrayChange('experience', i, 'startDate', e.target.value)} placeholder="Start Date" />
                  <input style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 13, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={exp.endDate} onChange={e => handleArrayChange('experience', i, 'endDate', e.target.value)} placeholder="End Date" />
                  <input style={{ fontSize: 14, marginLeft: 8, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={exp.title} onChange={e => handleArrayChange('experience', i, 'title', e.target.value)} placeholder="Title" />
                  <textarea style={{ fontSize: 13, marginLeft: 16, marginTop: 2, color: '#444', width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={exp.description} onChange={e => handleArrayChange('experience', i, 'description', e.target.value)} placeholder="Description" />
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{exp.organization} <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 13 }}>| {exp.startDate} - {exp.endDate}</span></div>
                  <div style={{ fontSize: 14, marginLeft: 8 }}>{exp.title}</div>
                  <div style={{ fontSize: 13, marginLeft: 16, marginTop: 2, color: '#000000' }}>{exp.description?.split(/\n|•|-/).map((d, j) => d.trim() && <div key={j} style={{ marginBottom: 2 }}>{d.trim()}</div>)}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid #bbb', marginBottom: 10, letterSpacing: 0.2 }}>Projects</div>
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              {isEditing ? (
                <>
                  <input style={{ fontWeight: 800, fontSize: 15, marginLeft: 0, marginBottom: 2, letterSpacing: 0.1, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={proj.title} onChange={e => handleArrayChange('projects', i, 'title', e.target.value)} placeholder="Project Title" />
                  <input style={{ fontStyle: 'italic', fontSize: 13, marginBottom: 4, marginLeft: 0, color: '#666', width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={proj.organization || ''} onChange={e => handleArrayChange('projects', i, 'organization', e.target.value)} placeholder="Organization (optional)" />
                  <textarea style={{ fontSize: 13, marginTop: 2, color: '#444', width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={proj.description} onChange={e => handleArrayChange('projects', i, 'description', e.target.value)} placeholder="Project Description" />
                  <input style={{ fontSize: 13, marginTop: 4, marginLeft: 0, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={proj.link || ''} onChange={e => handleArrayChange('projects', i, 'link', e.target.value)} placeholder="Project Link (optional)" />
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 800, fontSize: 15, marginLeft: 0, marginBottom: 2, letterSpacing: 0.1 }}>{proj.title}</div>
                  {proj.organization && (
                    <div style={{ fontStyle: 'italic', fontSize: 13, marginBottom: 4, marginLeft: 0, color: '#666' }}>{proj.organization}</div>
                  )}
                  {proj.description && proj.description
                    .split(/\n/g)
                    .map(line => line.trimEnd())
                    .filter(line => line.length > 0)
                    .map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          marginBottom: 2,
                          lineHeight: 1.6,
                          fontSize: 13,
                          fontFamily: 'Georgia, Times, serif',
                          color: '#000000',
                          textAlign: 'left',
                          wordBreak: 'break-word',
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  {proj.link && <div style={{ fontSize: 13, marginTop: 4, marginLeft: 0 }}><a href={proj.link} style={{ color: '#1a0dab', textDecoration: 'underline' }}>{proj.link}</a></div>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div style={{ marginBottom: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17, borderBottom: '1px solid #bbb', marginBottom: 8 }}>Education</div>
          {education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{edu.institution}</div>
              <div style={{ fontSize: 13, marginLeft: 8 , fontFamily: 'Georgia, Times, serif', color: '#000000'}}>{edu.degree} | {edu.startDate} - {edu.endDate}</div>
              <div style={{ fontSize: 13, marginLeft: 8 , fontFamily: 'Georgia, Times, serif', color: '#000000'}}>{edu.location}</div>
              {edu.grade && <div style={{ fontSize: 13, marginLeft: 8 ,fontFamily: 'Georgia, Times, serif', color: '#000000'}}>Grade: {edu.grade}</div>}
            </div>
          ))}
        </div>
      )}
      {isEditing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button
            style={{ padding: '8px 24px', fontSize: 15, fontWeight: 600, background: '#222', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onClick={() => onSave && onSave(editState)}
          >
            Save
          </button>
          <button
            style={{ padding: '8px 24px', fontSize: 15, fontWeight: 600, background: '#eee', color: '#222', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onClick={() => onCancel && onCancel()}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
} 