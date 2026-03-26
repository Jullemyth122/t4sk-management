import React, { useState, useEffect } from 'react';

export default function PcPromptModal({ opts }) {
    if (!opts) return null;
    const [values, setValues] = useState({});

    useEffect(() => {
        const init = {};
        (opts.fields || []).forEach(f => { init[f.id] = f.defaultValue || ''; });
        setValues(init);
    }, [opts]);

    const handleSubmit = (e) => {
        e.preventDefault();
        opts.onConfirm && opts.onConfirm(values);
        opts.onCancel && opts.onCancel();
    };

    return (
        <div className="pc-prompt-overlay">
            <div className="pc-prompt-card">
                <h3 className="pc-prompt-title">{opts.title}</h3>
                {opts.description && <p className="pc-prompt-desc">{opts.description}</p>}
                
                <form onSubmit={handleSubmit}>
                    {(opts.fields || []).map((f, i) => (
                        <div key={f.id} className="pc-prompt-field">
                            <label className="pc-prompt-label">{f.label}</label>
                            {f.type === 'color' ? (
                                <input
                                    type="color"
                                    value={values[f.id] || '#6366f1'}
                                    onChange={e => setValues({...values, [f.id]: e.target.value})}
                                    className="pc-prompt-color"
                                />
                            ) : (
                                <input
                                    type="text"
                                    autoFocus={i === 0}
                                    value={values[f.id] || ''}
                                    onChange={e => setValues({...values, [f.id]: e.target.value})}
                                    className="pc-prompt-input"
                                />
                            )}
                        </div>
                    ))}
                    <div className="pc-prompt-actions">
                        <button type="button" onClick={opts.onCancel} className="pc-prompt-btn pc-prompt-btn--cancel">Cancel</button>
                        <button type="submit" className={`pc-prompt-btn pc-prompt-btn--confirm ${opts.danger ? 'pc-prompt-btn--danger' : ''}`}>{opts.submitText || 'Confirm'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
