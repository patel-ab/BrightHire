def render(candidate_name: str, job_title: str, company_name: str, why_matched: str) -> dict:
    return {
        "subject": f"Great News — You've Been Shortlisted for {job_title}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3748;">You've Been Shortlisted!</h2>
            <p>Hi {candidate_name},</p>
            <p>
                Congratulations! You've been shortlisted for
                <strong>{job_title}</strong> at <strong>{company_name}</strong>.
            </p>
            <div style="background: #f0fff4; border-left: 4px solid #38a169;
                        padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; color: #2f855a;">
                    <strong>Why you matched:</strong> {why_matched}
                </p>
            </div>
            <p>The recruiter will be in touch with next steps soon.</p>
            <br/>
            <p style="color: #718096; font-size: 13px;">
                This is an automated message from BrightHire.
                Please do not reply to this email.
            </p>
        </div>
        """
    }