PATH_BASE = File.expand_path(File.dirname(__FILE__)).split("/creator.rb")[0]
puts PATH_BASE

require_relative "models"
require 'vips'
require 'aws-sdk-s3'
require 'curb'
require 'zip'

Aws.config[:credentials] = Aws::Credentials.new(
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY
)
Aws.config[:region]      = AWS_REGION

S3 = Aws::S3::Client.new(region: 'us-east-1')

class Creator

  def self.generate_image_grouping(squares)
    image_urls = {}
    squares.each do |square|
      imgbase = square.img.split("ipfs://")[1]
      audiobase = square.audio.nil? ? nil : square.audio.split("ipfs://")[1]

      if image_urls[imgbase] === nil then
        xes = {}
        xes[square.x] = [square.y]
        image_urls[imgbase] = { ipfs: imgbase, idxes: [square.idx], x: [square.x], y: [square.y], xes: xes, msg: square.msg, url: square.url, traits: square.traits, types: [square.the_type], audio: audiobase, tdrs: square.tdrs, tdrses: {"#{square.idx}": square.tdrs} }
      else
        image_urls[imgbase][:idxes].push(square.idx)
        image_urls[imgbase][:x].push(square.x)
        image_urls[imgbase][:y].push(square.y)
        image_urls[imgbase][:traits].concat(square.traits)
        image_urls[imgbase][:types].push(square.the_type)
        image_urls[imgbase][:tdrses][:"#{square.idx}"] = square.tdrs
        begin
          image_urls[imgbase][:xes][square.x].push(square.y)
        rescue
          image_urls[imgbase][:xes][square.x] = [square.y]
        end
      end
    end
    return image_urls
  end

  def self.generate_drawings(image_mappings)
    drawings = {}
    image_mappings.each do |key, image|
      keys = image[:xes].keys.sort
      consecutive_xes = consecutive_slices(keys)
      consecutive_yes = {}
      consecutive_xes.each do |key, consecutive_x|
        consecutive_x.each do |x|
          consecutive_y_slice = consecutive_slices(image[:xes][x].sort)
          consecutive_yes[x] = consecutive_y_slice.values
        end
      end

      consecutive_xes.each do |key, consecutive_x|
        consecutive_x.each do |x_start|
          x_end = 0
          consecutive_yes[x_start].each do |consecutive_y|
            x_end = consecutive_x.filter { |x| consecutive_yes[x].include?(consecutive_y) }.max
            y_start = consecutive_y.min
            y_end = consecutive_y.max
            drawingkey = "#{x_end}#{y_start}#{y_end}"
            if drawings[drawingkey] then
              drawings[drawingkey][:x_start] = drawings[drawingkey][:x_start] < x_start ? drawings[drawingkey][:x_start] : x_start
            else
              drawings[drawingkey] = {image: image[:ipfs], x_start: x_start, x_end: x_end, y_start: y_start, y_end: y_end, msg: image[:msg], url: image[:url], traits: image[:traits].uniq, types: image[:types].uniq, audio: image[:audio], tdrs: image[:tdrs], tdrses: image[:tdrses] }
            end
          end
        end
      end
    end
    return drawings
  end

  def self.create_space_image(drawings, skiplist)
    size = 400
    space = Vips::Image.black(100*size, 100*size, bands: 3)
    
    drawings.each do |key, drawing|
      puts "adding image: #{drawing[:image]}"
      begin
        image = Vips::Image.new_from_file("#{PATH_BASE}/images/#{drawing[:image]}", access: :sequential)
        if image then
          if image.get("vips-loader") == "gifload" then
            puts "#{drawing[:image]} is a gif, adding to giflist"
          else
          # unless skiplist.include?(key)
            if image.has_alpha? then
              image = image.flatten background: [0, 0, 0]
            end
            image =  image.colourspace(:srgb)
            max_width = (drawing[:x_end]+1 - drawing[:x_start])*size
            max_height = (drawing[:y_end]+1 - drawing[:y_start])*size
            width_scale = max_width / image.width.to_f
            height_scale = max_height / image.height.to_f
            scale = [width_scale, height_scale].min
            image = image.resize scale, kernel: :nearest
            width_offset = (max_width - image.width)/2.0
            height_offset = (max_height - image.height)/2.0
            x_start = (drawing[:x_start]*size) + width_offset
            y_start = (drawing[:y_start]*size) + height_offset
            space = space.insert(image, x_start, y_start)
          end
        else
          puts "something failed loading the image"
        end
      rescue
        puts "failed to add: #{drawing[:image]}"
      end
    end
    return space
  end

  def self.validate_images(drawings)
    skiplist = []
    drawings.each do |key, drawing|
      begin
        path = "#{PATH_BASE}/images/#{drawing[:image]}"
        img = Vips::Image.new_from_file path
        if ["pngload", "gifload"].include?(img.get("vips-loader")) then
          puts "converting png or gif to jpeg: " + drawing[:image].to_s
          img.jpegsave(path+".jpeg", Q: 90)
          %x(mv #{PATH_BASE}/images/#{drawing[:image]}.jpeg #{PATH_BASE}/images/#{drawing[:image]})
        end
        file = File.open(path)

        if file.size > 11000000 then  
          img = Vips::Image.new_from_file path
          scale = 11000000.0 / file.size
          newimg = img.resize scale, kernel: :nearest
          newimg.jpegsave(path+".jpeg")
          %x(mv #{PATH_BASE}/images/#{drawing[:image]}.jpeg #{PATH_BASE}/images/#{drawing[:image]})
        end
      rescue => error
        puts "error: " + error.message
        puts "image: " + drawing[:image].to_s
        if error.message.include?("not a known file format") or error.message.include?("does not exist") then
          puts "redownloading #{drawing[:image]}"
          %x(rm #{PATH_BASE}/images/#{drawing[:image]})
          download_ipfs(drawing[:image])
        elsif error.message.include?("Image EOF detected") then
          skiplist.push(key)
        end
      end
    end
    return skiplist
  end


  def self.upload_new_tiles
    diffs = %x(diff -rqN #{PATH_BASE}/newspace_files #{PATH_BASE}/space_files|cut -f2 -d ' ').split("\n")
    diffs = diffs.keep_if { |f| f.include?("jpeg")}
    diffs.each do |new_image|
      image_path = new_image.split("newspace_files/")[1]
      %x(mv #{new_image} #{PATH_BASE}/space_files/#{image_path})
    end
    files = diffs.map { |diff| diff.gsub("newspace_files", "space_files")}
    
    # files = Dir[ File.join('space_files', '**', '*') ].reject { |p| File.directory? p }
    files.each do |f|
      puts "uploading #{f}"
      image_path = f.split("space_files/")[1]
      S3.put_object(body: File.read(f), bucket: BUCKET_NAME, key: "public/space_files/" + image_path)
      # faster uploading? https://netdevops.me/2018/uploading-multiple-files-to-aws-s3-in-parallel/
    end

    %x(mv #{PATH_BASE}/newspace.dzi #{PATH_BASE}/space.dzi)
    S3.put_object(body: File.read("#{PATH_BASE}/space.dzi"), bucket: BUCKET_NAME, key: "public/" + "space.dzi")

    sqs = Square.where.not(img: "ipfs://QmegSPCaeSnrnV4R7c4FNFyartRpCzWtm97ETPohmhK9zB").select(:x, :y, :url, :msg, :id, :img, :idx)
    sqs_data = {}
    sqs.map { |s| sqs_data["#{s.x.to_s.rjust(2, '0')}#{s.y.to_s.rjust(2, '0')}"] = s.attributes }

    puts "uploading destinations zip"
    Zip::File.open("#{PATH_BASE}/destinations.zip", create: true) { |zipfile|
        zipfile.get_output_stream("destinations.json") { |f| f.puts sqs_data.to_json }
      }
    S3.put_object(body: File.read("#{PATH_BASE}/destinations.zip"), bucket: BUCKET_NAME, key: "public/destinations.zip")
    %x(rm -rf #{PATH_BASE}/newspace_files)
    %x(rm #{PATH_BASE}/destinations.zip)
  end

  def self.upload_gifs(drawings)
    giflist = drawings.select { |k,v| v[:traits].include?("Dynamic") }
    gif_imgs = giflist.map { |key, values| "ipfs://" + values[:image].to_s }
    small_gifs_ipfses = Square.where(img: gif_imgs).where("img_size < ?", 10000000).pluck(:img)
    giflist.keep_if { |key, values| values[:image] && small_gifs_ipfses.include?("ipfs://" + values[:image].to_s) }

    puts "uploading gifs zip"
    Zip::File.open("#{PATH_BASE}/gifs.zip", create: true) { |zipfile|
      zipfile.get_output_stream("gifs.json") { |f| f.puts giflist.to_json }
    }
    S3.put_object(body: File.read("#{PATH_BASE}/gifs.zip"), bucket: BUCKET_NAME, key: "public/gifs.zip")
    %x(rm #{PATH_BASE}/gifs.zip)
  end

  def self.upload_drawings(drawings)
    drawings_map = {}
    drawings.map { |key, values| drawings_map[values[:image]] ? drawings_map[values[:image]][:coordinates].push(values.slice(:x_start, :x_end, :y_start, :y_end)) : drawings_map[values[:image]] = {data: values, coordinates: [values.slice(:x_start, :x_end, :y_start, :y_end)] } }

    puts "uploading drawings zip"
    Zip::File.open("#{PATH_BASE}/drawings.zip", create: true) { |zipfile|
      zipfile.get_output_stream("drawings.json") { |f| f.puts drawings_map.to_json }
    }
    S3.put_object(body: File.read("#{PATH_BASE}/drawings.zip"), bucket: BUCKET_NAME, key: "public/drawings.zip")
    %x(rm #{PATH_BASE}/drawings.zip)
  end

  def self.generate
    squares = Square.where.not(img: "ipfs://QmegSPCaeSnrnV4R7c4FNFyartRpCzWtm97ETPohmhK9zB").select(:idx, :x, :y, :bought, :img, :url, :msg, :img_valid, :img_size, :img_is_gif, :id, :traits, :the_type, :audio, :tdrs)
    images = generate_image_grouping(squares)
    drawings = generate_drawings(images)
    skiplist = validate_images(drawings)
    puts "creating space image"
    space = create_space_image(drawings, skiplist)
    puts "space image created"

    if false then
      puts "resizing space"
      smaller_space = space.resize(0.25)
      puts "saving smaller space"
      smaller_space.pngsave("#{PATH_BASE}/space.png", strip: true)
      puts "smaller space saved, uploading space"
      S3.put_object(body: File.read("#{PATH_BASE}/space.png"), bucket: BUCKET_NAME, key: "public/space.png")
      %x(rm #{PATH_BASE}/space.png)
      puts "smaller space uploaded"
    else
      # removing old files
      %x(rm -rf #{PATH_BASE}/newspace_files)
      %x(rm #{PATH_BASE}/destinations.zip)

      puts "saving newspace files"
      space.dzsave("newspace", dirname: PATH_BASE)
      puts "saved newspace files, uploading drawings"
      
      upload_gifs(drawings)
      upload_drawings(drawings)
      puts "uploaded drawings, starting to upload new tiles"
      upload_new_tiles
    end
  end

  def self.ipfs_url(ipfs)
    return "https://cardanospace.mypinata.cloud/ipfs/#{ipfs.split("ipfs://")[-1]}"
  end


  def self.consecutive_slices(sorted_numbers)
    consecutive_numbers = {}
    i = 0
    consecutive_number_pairs = sorted_numbers.each_cons(2)
    if consecutive_number_pairs.any? then
      consecutive_number_pairs.map.with_index(1) do |values, idx|
        consecutive_numbers[i] = consecutive_numbers[i].to_a + [values.first]
        if idx == consecutive_number_pairs.to_a.length && values.second == values.first+1
          consecutive_numbers[i] = consecutive_numbers[i].to_a + [values.second]
        elsif idx == consecutive_number_pairs.to_a.length
          consecutive_numbers[i+1] = [values.second]
        end
        i += 1 if not values.second == values.first+1
      end
      return consecutive_numbers
    else
      consecutive_numbers = {}
      sorted_numbers.each_with_index { |sn, idx| consecutive_numbers[idx] = [sn] }
      return consecutive_numbers
    end
  end

  def self.download_ipfses_since(datetime)
    puts "downloading newly updated images"
    updated_images = Square.where("updated_at > ?", datetime).where.not(img: "ipfs://QmegSPCaeSnrnV4R7c4FNFyartRpCzWtm97ETPohmhK9zB").distinct.pluck(:img)
    updated_images.each do |image|
      begin
        imgbase = image.split("ipfs://")[1].gsub(/\W/, "")
        puts "downloading #{imgbase}"
        download_ipfs(imgbase)
      rescue
      end
    end
  end

  def self.download_ipfs(imgbase)
    begin
      if not File.file?("#{PATH_BASE}/images/" + imgbase) then
        imgurl = ipfs_url(imgbase)
        io = Curl.get(imgurl).body_str
        if not io.include?("Time-out") and not io.include?("invalid CID") and not io.include?("stream timeout") then
          File.write("#{PATH_BASE}/images/" + imgbase, io)
        else
          %x(cp #{PATH_BASE}/black.jpg #{PATH_BASE}/images/#{imgbase})
        end
      end
    rescue => error
      puts error
    end
  end
end