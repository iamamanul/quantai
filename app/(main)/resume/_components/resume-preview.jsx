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
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', background: 'transparent', padding: 0, margin: 0 }}>
      <div
        className="resume-preview-print"
        style={{
          fontFamily: 'Georgia, Times, serif',
          color: '#222',
          background: '#fff',
          padding: '40px',
          maxWidth: 800,
          width: '100%',
          fontSize: 15,
          lineHeight: 1.5,
          boxSizing: 'border-box',
          margin: 0,
        }}
      >
        <style>{`
          @media (max-width: 600px) {
            .resume-header {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 8px;
            }
            .resume-header-right {
              text-align: left !important;
              width: 100% !important;
            }
            .resume-preview-container {
              padding: 4vw !important;
              font-size: 13px !important;
            }
            .resume-preview-container h1 {
              font-size: 7vw !important;
            }
            .resume-preview-container input,
            .resume-preview-container textarea {
              font-size: 13px !important;
              width: 100% !important;
            }
          }
          .resume-section-divider {
            width: 100%;
            margin: 0;
            padding: 0;
          }
          @media print {
            /* FIXED: Complete print reset - removed all margins and padding */
            @page {
              margin: 0 !important;
              padding: 0 !important;
              size: A4;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              overflow: visible !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            /* FIXED: Reset resume container completely for print */
            .resume-preview-print {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              background: white !important;
              position: static !important;
              top: auto !important;
              left: auto !important;
              transform: none !important;
            }
            .resume-section-divider {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: 0;
              border-top: 1px solid #bbb !important;
            }
            .resume-header,
            .resume-header-right,
            .resume-preview-print > div[style*='border-bottom'],
            .resume-preview-print > div[style*='border-top'] {
              width: 100vw !important;
              max-width: none !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
          }
        `}</style>
        {/* Header */}
        <div className="resume-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #222', paddingBottom: 8, gap: 0 }}>
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
            <div style={{ fontSize: 17, fontWeight: 500, marginTop: 0, marginBottom: 10 }}>{isEditing ? (
              <input
                style={{ fontSize: 17, fontWeight: 500, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }}
                value={editState.title || "Information Technology"}
                onChange={e => setEditState((prev) => ({ ...prev, title: e.target.value }))}
              />
            ) : (
              formValues.title || "Information Technology"
            )}</div>
          </div>
          <div className="resume-header-right" style={{ textAlign: 'right', fontSize: 13 }}>
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
        <div style={{ marginTop: 2, marginBottom: 12 }}>
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
        <div className="resume-section-divider" style={{ borderTop: '1px solid #bbb', borderBottom: '1px solid #bbb', margin: '10px 0', paddingBottom:'20px', marginBottom:'0px'}}>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Skills</div>
          {isEditing ? (
            <textarea style={{ fontSize: 13, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8', padding:'20px' }} value={skills} onChange={e => handleFieldChange('skills', e.target.value)} />
          ) : renderSkills(skills)}
        </div>

        {/* Experience */}
        {experience.length > 0 && (
          <div style={{ marginBottom: 0 , borderBottom: '1px solid #bbb' , paddingBottom: 15}}>
            <div className="resume-section-divider" style={{ fontWeight: 700, fontSize: 17, marginBottom: 0, paddingBottom: 5 }}>Experience</div>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 0 , marginLeft:20}}>
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
          <div style={{ marginBottom: 0 }}>
            <div className="resume-section-divider" style={{ fontWeight: 700, fontSize: 16, marginBottom: 0, letterSpacing: 0.2  }}>Projects</div>
            {projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: 18 , marginLeft:20}}>
                {isEditing ? (
                  <>
                    <input style={{ fontWeight: 800, fontSize: 15, marginLeft: 0, marginBottom: 2, letterSpacing: 0.1, width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={proj.title} onChange={e => handleArrayChange('projects', i, 'title', e.target.value)} placeholder="Project Title" />
                    <input style={{ fontStyle: 'italic', fontSize: 13, marginBottom: 4, marginLeft: 0, color: '#666', width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={proj.organization || ''} onChange={e => handleArrayChange('projects', i, 'organization', e.target.value)} placeholder="Organization (optional)" />
                    <textarea style={{ fontSize: 13, marginTop: 2 , color: '#444', width: '100%', border: 'none', outline: 'none', background: '#f8f8f8' }} value={proj.description} onChange={e => handleArrayChange('projects', i, 'description', e.target.value)} placeholder="Project Description" />
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
            <div className="resume-section-divider" style={{ fontWeight: 700, fontSize: 17, marginBottom: 0 , borderTop:'1px solid #bbb'}}>Education</div>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: 10 , marginLeft: 10}}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{edu.institution}</div>
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
              style={{ padding: '8px 25px', fontSize: 15, fontWeight: 600, background: '#eee', color: '#222', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => onCancel && onCancel()}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}