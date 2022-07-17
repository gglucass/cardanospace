require 'yaml'
require "sinatra/activerecord"

# models.rb
class Square < ActiveRecord::Base
  self.table_name = "squares"
  self.primary_key = "id"
end

class Metadata < ActiveRecord::Base
  self.table_name = "metadata"
  self.primary_key = "id"
end