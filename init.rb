require 'redmine'

Redmine::Plugin.register :redmine_auto_save_drafts do
  name 'Redmine Auto Save Drafts Plugin'
  author 'UNCHAINED,LLC'
  description 'A plugin to auto-save drafts locally and restore them in Redmine tickets and comments.'
  version '1.1.0'
  url 'https://github.com/unchained-llc/redmine_auto_save_drafts'
  author_url 'https://github.com/unchained-llc'
end

# Register the View Listener
class RedmineAutoSaveDraftsViewListener < Redmine::Hook::ViewListener
  # Adds JavaScript to the HTML head
  def view_layouts_base_html_head(context)
    javascript_include_tag('redmine_auto_save_drafts', plugin: :redmine_auto_save_drafts)
  end
end
