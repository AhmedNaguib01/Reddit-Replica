import StaticPage from './StaticPage';

const UserAgreementPage = ({ isSidebarCollapsed, onToggleSidebar }) => {
  return (
    <StaticPage 
      title="User Agreement" 
      isSidebarCollapsed={isSidebarCollapsed} 
      onToggleSidebar={onToggleSidebar}
    >
      <p>
        <em>Effective: December 1, 2025</em>
      </p>
      <p>
        This Reddit User Agreement ("Terms") applies to your access to and use of the websites, 
        mobile apps, widgets, APIs, emails, and other online products and services provided by 
        Reddit, Inc. ("Reddit," "we," "us," or "our").
      </p>
      
      <h2>1. Your Access to the Services</h2>
      <p>
        No one under 13 years of age is allowed to use or access the Services. We may offer 
        additional Services that require you to be older to use them, so please read all notices 
        and any Additional Terms carefully when you access the Services.
      </p>
      
      <h2>2. Your Use of the Services</h2>
      <p>
        Reddit grants you a personal, non-transferable, non-exclusive, revocable, limited license 
        to use and access the Services solely as permitted by these Terms. We reserve all rights 
        not expressly granted to you by these Terms.
      </p>
      <p>You may not:</p>
      <ul>
        <li>Use the Services in any manner that could interfere with, disable, disrupt, overburden, 
            or otherwise impair the Services</li>
        <li>Access or search the Services by any means other than through our currently available interfaces</li>
        <li>Use the Services to violate any applicable law or regulation</li>
        <li>Use the Services to infringe any intellectual property or other right of any person or entity</li>
      </ul>
      
      <h2>3. Your Reddit Account</h2>
      <p>
        To use certain features of our Services, you may be required to create a Reddit account 
        and provide us with a username, password, and certain other information about yourself.
      </p>
      <p>
        You are solely responsible for the information associated with your account and anything 
        that happens related to your account. You must maintain the security of your account and 
        immediately notify Reddit if you discover or suspect unauthorized access.
      </p>
      
      <h2>4. Your Content</h2>
      <p>
        The Services may contain information, text, links, graphics, photos, videos, audio, or 
        other materials ("Content"), including Content created by you or submitted to the Services 
        by you or through your account ("Your Content").
      </p>
      <p>
        You retain ownership rights in Your Content, but you grant Reddit a worldwide, royalty-free, 
        perpetual, irrevocable, non-exclusive, transferable, and sublicensable license to use, copy, 
        modify, adapt, prepare derivative works of, distribute, store, perform, and display Your Content.
      </p>
      
      <h2>5. Third-Party Content and Services</h2>
      <p>
        The Services may contain links to third-party websites, products, or services, which may 
        be posted by advertisers, our affiliates, our partners, or other users. Third-party content 
        is not under our control, and we are not responsible for any third-party websites or services.
      </p>
      
      <h2>6. Indemnity</h2>
      <p>
        You agree to indemnify, defend, and hold harmless Reddit, its affiliates, and their respective 
        directors, officers, employees, and agents from and against all claims, damages, obligations, 
        losses, liabilities, costs, and expenses arising from your access to and use of the Services.
      </p>
      
      <h2>7. Disclaimers and Limitation of Liability</h2>
      <p>
        THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
        EITHER EXPRESS OR IMPLIED. REDDIT DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED 
        OR ERROR-FREE.
      </p>
      
      <h2>8. Changes to These Terms</h2>
      <p>
        We may make changes to these Terms from time to time. If we make changes, we will post 
        the revised Terms and update the Effective Date above. Your continued use of the Services 
        after the changes become effective constitutes your acceptance of the revised Terms.
      </p>
      
      <div className="highlight-box">
        <p><strong>Questions?</strong></p>
        <p>
          If you have any questions about these Terms, please contact us at legal@reddit.com
        </p>
      </div>
    </StaticPage>
  );
};

export default UserAgreementPage;
